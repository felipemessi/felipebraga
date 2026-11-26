# Applied once, locally, with a temporary bootstrap token (see infra/README.md).
# State stays local (and is git-ignored); after this runs, every other root
# keeps its state in the R2 bucket created here.

provider "cloudflare" {
  # Reads CLOUDFLARE_API_TOKEN from the environment.
}

resource "cloudflare_r2_bucket" "state" {
  account_id = var.account_id
  name       = var.state_bucket_name
  location   = var.state_bucket_location
}

# Permission groups are looked up by name so no opaque IDs live in the repo.
data "cloudflare_account_permission_groups" "workers_scripts_write" {
  account_id = var.account_id
  name       = "Workers Scripts Write"
}

data "cloudflare_account_permission_groups" "r2_storage_write" {
  account_id = var.account_id
  name       = "Workers R2 Storage Write"
}

# Token used by GitHub Actions: deploys the Worker and stores Terraform state.
# Features that add Cloudflare resources (D1, Turnstile, Email, Web Analytics)
# widen this list in their own change.
resource "cloudflare_account_token" "ci" {
  account_id = var.account_id
  name       = "felipebraga-ci"

  policies = [{
    effect = "allow"
    permission_groups = [
      { id = data.cloudflare_account_permission_groups.workers_scripts_write.result[0].id },
      { id = data.cloudflare_account_permission_groups.r2_storage_write.result[0].id },
    ]
    resources = jsonencode({
      "com.cloudflare.api.account.${var.account_id}" = "*"
    })
  }]
}
