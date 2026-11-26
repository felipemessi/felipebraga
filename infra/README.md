# Infra

Terraform for Cloudflare and GitHub. The site itself is deployed by `wrangler deploy` in `deploy.yml`; Terraform owns the infrastructure around it.

| Root          | What it manages                                                                                     | State                    |
| ------------- | --------------------------------------------------------------------------------------------------- | ------------------------ |
| `bootstrap/`  | R2 bucket for the state and the CI API token. Applied once, locally                                 | Local file (git-ignored) |
| `cloudflare/` | Provider and the optional custom domain (zone + Worker domain), off while `var.domain` is `null`    | R2, key `cloudflare/`    |
| `github/`     | Repository settings, Discussions, Dependabot security updates, environments, rulesets, one variable | R2, key `github/`        |
| `modules/`    | Shared modules (none yet)                                                                           | n/a                      |

Terraform `~> 1.10` is required (native S3 lockfile). Providers are pinned in `versions.tf` and `.terraform.lock.hcl` is committed with hashes for Linux and macOS.

## One-time setup (done by the owner)

1. In the Cloudflare dashboard, enable the `workers.dev` subdomain and create a temporary **bootstrap** API token with the permissions _Account API Tokens Write_, _Workers R2 Storage Write_ and _Workers Scripts Write_. Delete it after step 3.
2. Apply the bootstrap root:

   ```bash
   cd infra/bootstrap
   export CLOUDFLARE_API_TOKEN=<bootstrap token>
   terraform init
   terraform apply -var account_id=<account id>
   ```

3. Read the outputs (`terraform output`, add `-raw` and the name for the sensitive ones) and set the GitHub secrets and variable:

   ```bash
   gh secret set CLOUDFLARE_API_TOKEN      # output ci_api_token
   gh secret set CLOUDFLARE_ACCOUNT_ID
   gh secret set R2_ACCESS_KEY_ID          # output r2_access_key_id
   gh secret set R2_SECRET_ACCESS_KEY      # output r2_secret_access_key
   gh variable set R2_ENDPOINT             # output r2_endpoint
   gh secret set TF_GITHUB_TOKEN           # fine-grained PAT, this repository only
   ```

   `TF_GITHUB_TOKEN` needs these repository permissions: Administration, Environments, Secrets and variables (read/write), Contents and Pull requests (read), Metadata (read).

4. **Check that R2 honours the state lockfile** before trusting it: run `terraform init` and `terraform plan` in `infra/cloudflare` in two terminals at once. The second must fail with a lock error. If it does not, switch the state to HCP Terraform (free tier) and record the change in an ADR.
5. Bring the existing repository under management and review the first plan before applying:

   ```bash
   cd infra/github
   export GITHUB_TOKEN=<TF_GITHUB_TOKEN value>
   export AWS_ENDPOINT_URL_S3=<r2_endpoint> AWS_ACCESS_KEY_ID=<...> AWS_SECRET_ACCESS_KEY=<...>
   terraform init
   terraform import github_repository.site felipebraga
   terraform plan
   ```

6. After the first deploy, put the `workers.dev` address in `infra/github/terraform.tfvars` as `site_url`, and in the root `README.md`.

## Pipeline

[infra.yml](../.github/workflows/infra.yml) checks every root (`fmt`, `validate`, `tflint`, `trivy config`) and posts a plan on each PR that touches `infra/`. A merge to `main` re-plans and applies in the `infra` environment, which waits for the owner's approval; read the plan in the _plan_ job summary before approving. A weekly plan opens an issue when it finds drift.

The `production` environment has no required reviewer on purpose: CMS content commits use it, and they must go live in minutes. Only infra applies wait for approval.

## Local checks

```bash
terraform fmt -check -recursive infra
terraform -chdir=infra/cloudflare init -backend=false && terraform -chdir=infra/cloudflare validate
tflint --config="$PWD/infra/.tflint.hcl" --chdir=infra/cloudflare
trivy config --severity HIGH,CRITICAL --ignorefile infra/.trivyignore infra
```

## Secrets

Nothing sensitive is committed. Secrets live only in GitHub Secrets and are never passed through Terraform, so they do not reach the state. `.gitignore` already covers `.terraform/`, `*.tfstate*`, `.dev.vars` and `.env*`. The bootstrap state is local and holds the CI token value: keep that directory private and delete the state file once the secrets are stored.
