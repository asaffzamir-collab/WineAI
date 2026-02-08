#!/bin/bash
# WineJourney Database Schema Setup
# Usage: ./scripts/run-schema.sh YOUR_SUPABASE_ACCESS_TOKEN

set -e

TOKEN="$1"
PROJECT_REF="qojtkhdjcbenvnjszcvb"

if [ -z "$TOKEN" ]; then
  echo "Usage: ./scripts/run-schema.sh YOUR_SUPABASE_ACCESS_TOKEN"
  echo ""
  echo "Get your access token from: https://supabase.com/dashboard/account/tokens"
  exit 1
fi

echo "🍷 WineJourney Database Setup"
echo "============================"
echo ""
echo "Running schema on project: $PROJECT_REF"
echo ""

# Read and run the SQL schema
SCHEMA=$(cat "$(dirname "$0")/../supabase/schema.sql")

curl -s -X POST "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SCHEMA" | jq -Rs .)}" | jq .

echo ""
echo "✅ Database schema setup complete!"
