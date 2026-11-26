#!/usr/bin/env bash
# Sets every environment secret from the bootstrap outputs without printing or
# writing a value. Run it locally from infra/bootstrap after `terraform apply`.
# Needs gh (logged in), terraform, and CLOUDFLARE_ACCOUNT_ID in the environment.
# TF_GITHUB_TOKEN is read from the terminal, never from a file.
set -euo pipefail

repo="${REPO:-felipemessi/felipebraga}"
: "${CLOUDFLARE_ACCOUNT_ID:?export CLOUDFLARE_ACCOUNT_ID first}"

out() { terraform output -raw "$1"; }
secret() { gh secret set "$1" --env "$2" --repo "$repo" --body -; }

for env in production preview infra-plan infra; do
  printf '%s' "$CLOUDFLARE_ACCOUNT_ID" | secret CLOUDFLARE_ACCOUNT_ID "$env"
done

out deploy_api_token | secret CLOUDFLARE_API_TOKEN production
out preview_api_token | secret CLOUDFLARE_API_TOKEN preview

read -rsp 'TF_GITHUB_TOKEN (fine-grained PAT): ' tf_github_token
echo

for env in infra-plan infra; do
  out infra_api_token | secret CLOUDFLARE_API_TOKEN "$env"
  out r2_access_key_id | secret R2_ACCESS_KEY_ID "$env"
  out r2_secret_access_key | secret R2_SECRET_ACCESS_KEY "$env"
  printf '%s' "$tf_github_token" | secret TF_GITHUB_TOKEN "$env"
  gh variable set R2_ENDPOINT --env "$env" --repo "$repo" --body "$(out r2_endpoint)"
done

echo "Secrets set. Delete the bootstrap state file once the workflows run."
