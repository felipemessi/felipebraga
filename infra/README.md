# Infra

Terraform for Cloudflare and GitHub. The site itself is deployed by `wrangler deploy` in `deploy.yml`; Terraform owns the infrastructure around it.

| Root          | What it manages                                                                                     | State                    |
| ------------- | --------------------------------------------------------------------------------------------------- | ------------------------ |
| `bootstrap/`  | R2 bucket for the state and three scoped API tokens (deploy, preview, infra). Applied once, locally | Local file (git-ignored) |
| `cloudflare/` | Provider and the optional custom domain (zone + Worker domain), off while `var.domain` is `null`    | R2, key `cloudflare/`    |
| `github/`     | Repository settings, Discussions, Dependabot security updates, environments, rulesets, one variable | R2, key `github/`        |
| `modules/`    | Shared modules (none yet)                                                                           | n/a                      |

Terraform `~> 1.10` is required (native S3 lockfile). Providers are pinned in `versions.tf` and `.terraform.lock.hcl` is committed with hashes for Linux and macOS.

## Environments and secrets

Every secret is an **environment** secret, never a repository one, so a workflow on an arbitrary branch cannot read it. `production` only runs from `main`.

| Environment  | Used by                                        | Secrets                                                                                                                                              |
| ------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `production` | `deploy.yml`, deploy job (`main` only)         | `CLOUDFLARE_API_TOKEN` (deploy token), `CLOUDFLARE_ACCOUNT_ID`                                                                                       |
| `preview`    | `preview.yml`, upload job                      | `CLOUDFLARE_API_TOKEN` (preview token), `CLOUDFLARE_ACCOUNT_ID`                                                                                      |
| `infra-plan` | `infra.yml` plans and the weekly drift check   | `CLOUDFLARE_API_TOKEN` (infra token), `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `TF_GITHUB_TOKEN`; variable `R2_ENDPOINT` |
| `infra`      | `infra.yml` apply, behind the owner's approval | The same as `infra-plan`                                                                                                                             |

The build jobs of `deploy.yml` and `preview.yml` run the project's code and dependencies and hold no secret. Pull requests from forks and Dependabot get no secrets, and the jobs that need them are skipped for those PRs.

## One-time setup (done by the owner)

1. In the Cloudflare dashboard, enable the `workers.dev` subdomain and create a temporary **bootstrap** API token with the permissions _Account API Tokens Write_, _Workers R2 Storage Write_ and _Workers Scripts Write_. Delete it after step 2. Also enable **R2** (R2 Object Storage, needs a payment method on file; the free tier covers the state): until then the bucket fails with error 10042, and the activation can take a few minutes to propagate.
2. Apply the bootstrap root and keep its outputs at hand (`terraform output -raw <name>` for the sensitive ones):

   ```bash
   cd infra/bootstrap
   export CLOUDFLARE_API_TOKEN=<bootstrap token>
   terraform init
   terraform apply -var account_id=<account id> -var enable_domain_permissions=true
   ```

3. **Check that R2 honours the state lockfile** before trusting it: run `terraform init` and `terraform plan` in `infra/cloudflare` in two terminals at once (with the R2 variables from step 4). The second must fail with a lock error. If it does not, switch the state to HCP Terraform (free tier) and record the change in an ADR. Verified for this setup: a second `plan` fails with `Error acquiring the state lock` while another run holds it.

   If `terraform init` fails with `tls: handshake failure` against the R2 endpoint, run `export GODEBUG=tlsmlkem=0` first. Go's post-quantum key share is rejected by the R2 S3 endpoint from some networks; `curl --tlsv1.2` reaches it, and the setting only affects the local shell.

4. Create the environments by applying the `github` root locally, bringing the existing repository under management first. Review the plan before applying. `TF_GITHUB_TOKEN` is a fine-grained PAT for this repository only, with these permissions: Administration, Environments, Secrets and variables (read/write), Contents and Pull requests (read), Metadata (read).

   ```bash
   cd infra/github
   export GITHUB_TOKEN=<TF_GITHUB_TOKEN value>
   export AWS_ENDPOINT_URL_S3=<r2_endpoint> AWS_ACCESS_KEY_ID=<r2_access_key_id> AWS_SECRET_ACCESS_KEY=<r2_secret_access_key>
   terraform init
   terraform import github_repository.site felipebraga
   terraform plan
   terraform apply
   ```

5. Set the secrets per environment. Secrets never go through Terraform, so they stay out of the state: this local script reads the bootstrap outputs and calls `gh secret set`, printing nothing. It asks for `TF_GITHUB_TOKEN` on the terminal.

   ```bash
   cd infra/bootstrap
   export CLOUDFLARE_ACCOUNT_ID=<account id>
   ./set-secrets.sh
   ```

6. Run the first deploy (`deploy.yml`, manually or by merging to `main`), then turn on the domain below. Production is [febraga.dev](https://febraga.dev); `site_url` in `infra/github/terraform.tfvars` already holds it.

### Turning on the custom domain

The production domain is `febraga.dev`. The permission group names used for the zone ("Zone Write", "DNS Write", "Workers Routes Write") were checked against the account's permission groups and exist.

1. `domain = "febraga.dev"` is set in `cloudflare/terraform.tfvars`, which needs the infra token to hold the zone permissions (`enable_domain_permissions=true` in `bootstrap/`, step 2 passes it) and the Worker to be deployed already, because the Worker domain attaches to it.
2. The zone was created in the Cloudflare dashboard, so `cloudflare/import.tf` imports it (`id` is the zone ID, not a secret) and the first apply adopts it instead of creating a second one. The plan shows `1 to import, 1 to add, 1 to change`; the change is only the account ID being marked sensitive. For a domain registered elsewhere, change its nameservers to the ones Cloudflare shows for the zone.
3. The zone has `prevent_destroy`: setting `domain` back to `null` makes `apply` fail instead of deleting the zone.

Production has `workers_dev` off in `wrangler.jsonc`. Keep the account's `workers.dev` subdomain enabled (step 1), because preview URLs still use it.

## Pipeline

[infra.yml](../.github/workflows/infra.yml) checks every root (`fmt`, `validate`, `tflint`, `trivy config`) and posts a plan on each same-repository PR that touches `infra/`. A merge to `main` saves each plan as a one-day artifact (it holds no secret) and the `apply` job applies those exact plans after one approval in the `infra` environment: read the _plan_ job summaries before approving. A weekly plan opens an issue when it finds drift and closes it when the plan is clean again.

Until the secrets exist (and, for previews, until the first production deploy has created the Worker), `preview.yml` skips its upload and `infra.yml` skips its plan and apply, each with a warning, so pull requests stay green during the one-time setup. `deploy.yml` has no such escape: a production deploy without credentials fails.

The `production` environment has no required reviewer on purpose: CMS content commits use it, and they must go live in minutes. Only infra applies wait for approval.

## Local checks

```bash
terraform fmt -check -recursive infra
terraform -chdir=infra/cloudflare init -backend=false && terraform -chdir=infra/cloudflare validate
tflint --config="$PWD/infra/.tflint.hcl" --chdir=infra/cloudflare
trivy config --severity HIGH,CRITICAL --ignorefile infra/.trivyignore infra
```

## Secrets

Nothing sensitive is committed. Secrets live only in GitHub environment secrets and are never passed through Terraform, so they do not reach the state. `.gitignore` already covers `.terraform/`, `*.tfstate*`, `.dev.vars` and `.env*`. The bootstrap state is local and holds the token values: keep that directory private and delete the state file once the secrets are stored.
