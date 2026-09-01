# Stripe Infrastructure
terraform {
  required_providers {
    stripe = {
      source  = "stripe/stripe"
      version = "0.2.2"
    }
  }
}

provider "stripe" {}

resource "stripe_product" "pro_workspace" {
  name = "Pro Workspace"
}

resource "stripe_webhook_endpoint" "events" {
  url            = var.webhook_url
  enabled_events = ["invoice.paid", "customer.subscription.updated", "customer.subscription.deleted"]
}

variable "webhook_url" {
  type = string
}
