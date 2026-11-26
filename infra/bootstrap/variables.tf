variable "account_id" {
  description = "Cloudflare account ID."
  type        = string
}

variable "state_bucket_name" {
  description = "R2 bucket that holds the Terraform state of the other roots."
  type        = string
  default     = "felipebraga-tfstate"
}

variable "enable_domain_permissions" {
  description = "Give the infra token the zone permissions needed to create the custom domain. Turn on together with var.domain in infra/cloudflare."
  type        = bool
  default     = false
}

variable "domain_permission_groups" {
  description = "Permission group names the infra token needs to manage the zone, DNS and Worker routes."
  type        = list(string)
  default     = ["Zone Write", "DNS Write", "Workers Routes Write"]
}

variable "state_bucket_location" {
  description = "R2 location hint (for example enam, weur). Null lets Cloudflare pick."
  type        = string
  default     = null
}
