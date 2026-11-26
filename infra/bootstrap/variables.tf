variable "account_id" {
  description = "Cloudflare account ID."
  type        = string
}

variable "state_bucket_name" {
  description = "R2 bucket that holds the Terraform state of the other roots."
  type        = string
  default     = "felipebraga-tfstate"
}

variable "state_bucket_location" {
  description = "R2 location hint (for example enam, weur). Null lets Cloudflare pick."
  type        = string
  default     = null
}
