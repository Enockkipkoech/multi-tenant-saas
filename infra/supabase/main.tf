# Official provider — manages project/org-level settings only. Table
# schema + RLS policies live in db/migrations/
terraform {
  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }
}

variable "supabase_access_token" {
  type      = string
  sensitive = true
}

variable "supabase_org_id" {
  type = string
}

provider "supabase" {
  access_token = var.supabase_access_token
}

resource "supabase_project" "switchboard" {
  organization_id    = var.supabase_org_id
  name               = "switchboard"
  database_password  = var.database_password
  region             = "af-south-1"
}

variable "database_password" {
  type      = string
  sensitive = true
}
