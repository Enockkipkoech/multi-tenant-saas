# Community-maintained provider — not official Railway/HashiCorp (README §7/§9).
terraform {
  required_providers {
    railway = {
      source  = "terraform-community-providers/railway"
      version = "~> 0.5"
    }
  }
}

variable "railway_api_token" {
  type      = string
  sensitive = true
}

provider "railway" {
  token = var.railway_api_token
}

resource "railway_project" "switchboard" {
  name = "switchboard"
}

resource "railway_service" "api" {
  project_id = railway_project.switchboard.id
  name       = "api"
}

resource "railway_service" "worker" {
  project_id = railway_project.switchboard.id
  name       = "worker"
}

# TODO: railway_variable resources for DATABASE_URL, SUPABASE_*, JWT_SECRET,
# TWILIO_AUTH_TOKEN, STRIPE_*, QUEUE_DRIVER per service — pulled from
# infra/supabase and infra/stripe outputs once those are applied.
