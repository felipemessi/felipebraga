provider "cloudflare" {
  # Reads CLOUDFLARE_API_TOKEN from the environment.
}

# The Worker and its static assets are deployed by `wrangler deploy` in the
# pipeline, so Terraform does not own them. This root holds only the
# account-level pieces around the site. D1, Turnstile, Email Routing and Web
# Analytics are added by the features that need them (4.1, 4.2).

locals {
  has_domain = var.domain != null
}

resource "cloudflare_zone" "site" {
  count = local.has_domain ? 1 : 0

  account = { id = var.account_id }
  name    = var.domain
  type    = "full"

  # Setting var.domain back to null would otherwise delete the zone and every
  # DNS record in it. Remove the zone by hand if that is really intended.
  lifecycle {
    prevent_destroy = true
  }
}

resource "cloudflare_workers_custom_domain" "site" {
  count = local.has_domain ? 1 : 0

  account_id = var.account_id
  zone_id    = cloudflare_zone.site[0].id
  hostname   = var.domain
  service    = var.worker_name
}
