output "state_bucket" {
  description = "Name of the R2 state bucket."
  value       = cloudflare_r2_bucket.state.name
}

output "r2_endpoint" {
  description = "S3-compatible endpoint for the backend blocks."
  value       = "https://${var.account_id}.r2.cloudflarestorage.com"
}

output "ci_api_token" {
  description = "Value for the CLOUDFLARE_API_TOKEN GitHub secret."
  value       = cloudflare_account_token.ci.value
  sensitive   = true
}

# R2 derives its S3 credentials from an API token: the access key ID is the
# token ID and the secret access key is the SHA-256 of the token value.
output "r2_access_key_id" {
  description = "Value for the R2 access key ID GitHub secret (AWS_ACCESS_KEY_ID)."
  value       = cloudflare_account_token.ci.id
}

output "r2_secret_access_key" {
  description = "Value for the R2 secret GitHub secret (AWS_SECRET_ACCESS_KEY)."
  value       = sha256(cloudflare_account_token.ci.value)
  sensitive   = true
}
