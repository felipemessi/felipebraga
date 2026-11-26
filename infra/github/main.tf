provider "github" {
  owner = var.owner
  # Reads GITHUB_TOKEN from the environment (fine-grained, this repository only).
}

# The repository already exists: bring it under management with
#   terraform import github_repository.site <repository>
# and review the first plan before applying.
resource "github_repository" "site" {
  name         = var.repository
  description  = "Personal blog in Portuguese about DevOps in a world with AI."
  visibility   = "public"
  has_issues   = true
  has_projects = false
  has_wiki     = false

  has_discussions        = true
  delete_branch_on_merge = true
  allow_merge_commit     = true
  allow_squash_merge     = true
  allow_rebase_merge     = false
  allow_auto_merge       = true

  security_and_analysis {
    secret_scanning {
      status = "enabled"
    }
    secret_scanning_push_protection {
      status = "enabled"
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "github_repository_vulnerability_alerts" "site" {
  repository = github_repository.site.name
  enabled    = true
}

resource "github_repository_dependabot_security_updates" "site" {
  depends_on = [github_repository_vulnerability_alerts.site]

  repository = github_repository.site.name
  enabled    = true
}

# Environments. `production` has no required reviewer on purpose: it is also
# used by CMS content commits, which must go live in minutes. Infra applies get
# their own gated environment.
resource "github_repository_environment" "preview" {
  repository  = github_repository.site.name
  environment = "preview"
}

resource "github_repository_environment" "production" {
  repository  = github_repository.site.name
  environment = "production"

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}

resource "github_repository_environment_deployment_policy" "production_main" {
  repository     = github_repository.site.name
  environment    = github_repository_environment.production.environment
  branch_pattern = "main"
}

# Plans (pull requests, pushes to main, the weekly drift check). No reviewer, so
# it never waits, but it holds the only credentials a plan needs. Pull requests
# from forks and Dependabot get no secrets, and the workflows skip them.
resource "github_repository_environment" "infra_plan" {
  repository  = github_repository.site.name
  environment = "infra-plan"
}

resource "github_repository_environment" "infra" {
  repository  = github_repository.site.name
  environment = "infra"

  reviewers {
    users = [var.owner_user_id]
  }

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}

resource "github_repository_environment_deployment_policy" "infra_main" {
  repository     = github_repository.site.name
  environment    = github_repository_environment.infra.environment
  branch_pattern = "main"
}

# Non-sensitive values only. Secrets (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID,
# the R2 key pair) are set with `gh secret set`, so they never pass through
# Terraform state. See infra/README.md.
resource "github_actions_variable" "public_site_url" {
  count = var.site_url != null ? 1 : 0

  repository    = github_repository.site.name
  variable_name = "PUBLIC_SITE_URL"
  value         = var.site_url
}

# main and develop: no force-push, no deletion, changes arrive by pull request.
# Repository admins bypass, which lets the CMS commit content straight to main.
resource "github_repository_ruleset" "protected" {
  for_each = toset(["main", "develop"])

  name        = "protect-${each.key}"
  repository  = github_repository.site.name
  target      = "branch"
  enforcement = "active"

  conditions {
    ref_name {
      include = ["refs/heads/${each.key}"]
      exclude = []
    }
  }

  bypass_actors {
    actor_id    = 5 # Repository admin role
    actor_type  = "RepositoryRole"
    bypass_mode = "always"
  }

  rules {
    deletion         = true
    non_fast_forward = true

    pull_request {
      required_approving_review_count = 0
    }

    dynamic "required_status_checks" {
      for_each = length(var.required_status_checks) > 0 ? [1] : []
      content {
        dynamic "required_check" {
          for_each = var.required_status_checks
          content {
            context = required_check.value
          }
        }
      }
    }
  }
}
