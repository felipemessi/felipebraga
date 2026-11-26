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

1. In the Cloudflare dashboard, enable the `workers.dev` subdomain and create a temporary **bootstrap** API token with the permissions _Account API Tokens Write_, _Workers R2 Storage Write_ and _Workers Scripts Write_. Delete it after step 2.
2. Apply the bootstrap root and keep its outputs at hand (`terraform output -raw <name>` for the sensitive ones):

   ```bash
   cd infra/bootstrap
   export CLOUDFLARE_API_TOKEN=<bootstrap token>
   terraform init
   terraform apply -var account_id=<account id>
   ```

3. **Check that R2 honours the state lockfile** before trusting it: run `terraform init` and `terraform plan` in `infra/cloudflare` in two terminals at once (with the R2 variables from step 4). The second must fail with a lock error. If it does not, switch the state to HCP Terraform (free tier) and record the change in an ADR.
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

5. Set the secrets per environment with the values from the outputs:

   ```bash
   gh secret set CLOUDFLARE_API_TOKEN  --env production   # deploy_api_token
   gh secret set CLOUDFLARE_ACCOUNT_ID --env production
   gh secret set CLOUDFLARE_API_TOKEN  --env preview      # preview_api_token
   gh secret set CLOUDFLARE_ACCOUNT_ID --env preview
   for env in infra-plan infra; do
     gh secret set CLOUDFLARE_API_TOKEN  --env $env       # infra_api_token
     gh secret set CLOUDFLARE_ACCOUNT_ID --env $env
     gh secret set R2_ACCESS_KEY_ID      --env $env       # r2_access_key_id
     gh secret set R2_SECRET_ACCESS_KEY  --env $env       # r2_secret_access_key
     gh secret set TF_GITHUB_TOKEN       --env $env
     gh variable set R2_ENDPOINT         --env $env       # r2_endpoint
   done
   ```

6. After the first deploy, put the `workers.dev` address in `infra/github/terraform.tfvars` as `site_url`, and in the root `README.md`.

### Turning on the custom domain

Set `enable_domain_permissions = true` in `bootstrap/` and apply it, so the infra token can manage the zone, DNS and Worker routes (check the permission group names in the dashboard first). Update the `infra` and `infra-plan` secret with the new token value, then set `domain` in `cloudflare/`. The zone has `prevent_destroy`: setting `domain` back to `null` makes `apply` fail instead of deleting the zone.

## Pipeline

[infra.yml](../.github/workflows/infra.yml) checks every root (`fmt`, `validate`, `tflint`, `trivy config`) and posts a plan on each same-repository PR that touches `infra/`. A merge to `main` saves each plan as a one-day artifact (it holds no secret) and the `apply` job applies those exact plans after one approval in the `infra` environment: read the _plan_ job summaries before approving. A weekly plan opens an issue when it finds drift and closes it when the plan is clean again.

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
