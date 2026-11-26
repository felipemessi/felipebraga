terraform {
  required_version = "~> 1.10"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  # State lives in the R2 bucket created by infra/bootstrap. The endpoint comes
  # from AWS_ENDPOINT_URL_S3 and the credentials from AWS_ACCESS_KEY_ID and
  # AWS_SECRET_ACCESS_KEY (see infra/README.md).
  backend "s3" {
    bucket       = "felipebraga-tfstate"
    key          = "cloudflare/terraform.tfstate"
    region       = "auto"
    use_lockfile = true

    use_path_style              = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }
}
