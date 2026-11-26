output "state_bucket" {
  description = "Name of the R2 state bucket."
  value       = cloudflare_r2_bucket.state.name
}

output "r2_endpoint" {
  description = "S3-compatible endpoint for the backend blocks (GitHub variable R2_ENDPOINT)."
  value       = "https://${var.account_id}.r2.cloudflarestorage.com"
}

output "deploy_api_token" {
  description = "CLOUDFLARE_API_TOKEN for the `production` environment."
  value       = cloudflare_account_token.deploy.value
  sensitive   = true
}

output "preview_api_token" {
  description = "CLOUDFLARE_API_TOKEN for the `preview` environment."
  value       = cloudflare_account_token.preview.value
  sensitive   = true
}

output "infra_api_token" {
  description = "CLOUDFLARE_API_TOKEN for the `infra` and `infra-plan` environments."
  value       = cloudflare_account_token.infra.value
  sensitive   = true
}

# R2 derives its S3 credentials from an API token: the access key ID is the
# token ID and the secret access key is the SHA-256 of the token value. They
# come from the infra token, which holds the R2 permission.
output "r2_access_key_id" {
  description = "R2_ACCESS_KEY_ID for the `infra` and `infra-plan` environments."
  value       = cloudflare_account_token.infra.id
}

output "r2_secret_access_key" {
  description = "R2_SECRET_ACCESS_KEY for the `infra` and `infra-plan` environments."
  value       = sha256(cloudflare_account_token.infra.value)
  sensitive   = true
}
