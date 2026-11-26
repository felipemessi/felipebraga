# Applied once, locally, with a temporary bootstrap token (see infra/README.md).
# State stays local (and is git-ignored); after this runs, every other root
# keeps its state in the R2 bucket created here.

provider "cloudflare" {
  # Reads CLOUDFLARE_API_TOKEN from the environment.
}

locals {
  account_scope = jsonencode({
    "com.cloudflare.api.account.${var.account_id}" = "*"
  })
  # Zone permissions on an account-owned token must nest the zones under the
  # account, or the API answers "Must specify a zone for account owned tokens".
  zone_scope = jsonencode({
    "com.cloudflare.api.account.${var.account_id}" = {
      "com.cloudflare.api.account.zone.*" = "*"
    }
  })
}

resource "cloudflare_r2_bucket" "state" {
  account_id = var.account_id
  name       = var.state_bucket_name
  location   = var.state_bucket_location
}

# Permission groups are looked up by name so no opaque IDs live in the repo.
# They come from the account API token endpoint (the names shown when creating
# a token), not from `cloudflare_account_permission_groups`, which reads the
# IAM endpoint and uses other names ("Workers Platform Admin", ...). The name
# filter must be URL-encoded.
data "cloudflare_account_api_token_permission_groups_list" "workers_scripts_write" {
  account_id = var.account_id
  name       = urlencode("Workers Scripts Write")
}

data "cloudflare_account_api_token_permission_groups_list" "r2_storage_write" {
  account_id = var.account_id
  name       = urlencode("Workers R2 Storage Write")
}

# Optional, only when the custom domain is enabled.
data "cloudflare_account_api_token_permission_groups_list" "domain" {
  for_each = var.enable_domain_permissions ? toset(var.domain_permission_groups) : toset([])

  account_id = var.account_id
  name       = urlencode(each.value)
}

# One token per job, so each can be revoked on its own and none holds more than
# its job needs. They are stored as environment secrets, never repository ones.

# Production deploy: only the `production` environment (main branch) uses it.
resource "cloudflare_account_token" "deploy" {
  account_id = var.account_id
  name       = "felipebraga-deploy"

  policies = [{
    effect = "allow"
    permission_groups = [
      { id = data.cloudflare_account_api_token_permission_groups_list.workers_scripts_write.result[0].id },
    ]
    resources = local.account_scope
  }]
}

# Preview uploads: only the `preview` environment uses it.
resource "cloudflare_account_token" "preview" {
  account_id = var.account_id
  name       = "felipebraga-preview"

  policies = [{
    effect = "allow"
    permission_groups = [
      { id = data.cloudflare_account_api_token_permission_groups_list.workers_scripts_write.result[0].id },
    ]
    resources = local.account_scope
  }]
}

# Terraform: state in R2, and the optional custom domain. Features that add
# Cloudflare resources (D1, Turnstile, Email, Web Analytics) widen this token in
# their own change. Only the `infra` and `infra-plan` environments use it.
resource "cloudflare_account_token" "infra" {
  account_id = var.account_id
  name       = "felipebraga-infra"

  policies = concat(
    [{
      effect = "allow"
      permission_groups = concat(
        [{ id = data.cloudflare_account_api_token_permission_groups_list.r2_storage_write.result[0].id }],
        # A Worker custom domain is an account-level resource (PUT /workers/domains),
        # so the zone permissions alone end in 403 Authentication error.
        var.enable_domain_permissions ? [{ id = data.cloudflare_account_api_token_permission_groups_list.workers_scripts_write.result[0].id }] : [],
      )
      resources = local.account_scope
    }],
    var.enable_domain_permissions ? [{
      effect            = "allow"
      permission_groups = [for group in data.cloudflare_account_api_token_permission_groups_list.domain : { id = group.result[0].id }]
      resources         = local.zone_scope
    }] : [],
  )
}
