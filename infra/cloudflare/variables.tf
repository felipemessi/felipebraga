variable "account_id" {
  description = "Cloudflare account ID."
  type        = string
  sensitive   = true
}

variable "worker_name" {
  description = "Name of the Worker deployed by wrangler (must match wrangler.jsonc)."
  type        = string
  default     = "felipebraga"
}

variable "domain" {
  description = "Production domain. While null, the site is served from workers.dev and no domain resource is created."
  type        = string
  default     = null
}
