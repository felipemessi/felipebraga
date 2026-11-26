variable "owner" {
  description = "GitHub user or organization that owns the repository."
  type        = string
  default     = "felipemessi"
}

variable "repository" {
  description = "Repository name."
  type        = string
  default     = "felipebraga"
}

variable "owner_user_id" {
  description = "Numeric GitHub user ID of the owner, who approves infra applies."
  type        = number
}

variable "site_url" {
  description = "Public origin of the site, exposed to builds as PUBLIC_SITE_URL. Null until the production address is known."
  type        = string
  default     = null
}

variable "required_status_checks" {
  description = "Status check contexts that must pass before merging into main or develop (job names from the CI pipeline, 1.5). Empty until 1.5 defines them."
  type        = list(string)
  default     = []
}
