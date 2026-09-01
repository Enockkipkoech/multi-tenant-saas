# Scalability Infrastructure for Multi-Tenant SaaS
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "af-south-1"
}

# TODO: AWS Infra 
#  - aws_sqs_queue.events
#  - aws_ecs_cluster / aws_ecs_service / aws_ecs_task_definition for the
#    Fargate worker pool, target-tracking autoscaling on SQS queue depth
#  - aws_iam_role scoped narrowly to SQS + Secrets Manager access
#  - aws_secretsmanager_secret for worker credentials
#  - aws_cloudwatch_log_group for worker logs
