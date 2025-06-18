#!/bin/zsh

# MCP Environment Setup Script
# Run this script to set up environment variables for MCP server

echo "🔧 Setting up MCP environment variables..."

# Check if .env.local exists
if [[ ! -f ".env.local" ]]; then
    echo "❌ .env.local file not found. Please create it first."
    exit 1
fi

# Source the .env.local file to load variables
set -a
source .env.local
set +a

# Export the specific variables that MCP_DOCKER needs
export GITHUB_PERSONAL_ACCESS_TOKEN
export NOTION_INTERNAL_INTEGRATION_TOKEN  
export PERPLEXITY_ASK_API_KEY

# Verify the variables are set
echo "📋 Checking environment variables..."

if [[ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]] || [[ "$GITHUB_PERSONAL_ACCESS_TOKEN" == "your_github_token_here" ]]; then
    echo "⚠️  GITHUB_PERSONAL_ACCESS_TOKEN not set or using placeholder"
fi

if [[ -z "$NOTION_INTERNAL_INTEGRATION_TOKEN" ]] || [[ "$NOTION_INTERNAL_INTEGRATION_TOKEN" == "your_notion_token_here" ]]; then
    echo "⚠️  NOTION_INTERNAL_INTEGRATION_TOKEN not set or using placeholder"  
fi

if [[ -z "$PERPLEXITY_ASK_API_KEY" ]] || [[ "$PERPLEXITY_ASK_API_KEY" == "your_perplexity_key_here" ]]; then
    echo "⚠️  PERPLEXITY_ASK_API_KEY not set or using placeholder"
fi

echo "✅ Environment setup complete!"
echo "💡 Remember to replace placeholder values with your actual tokens in .env.local"
echo "🔄 You may need to restart VS Code for MCP server to pick up the changes"
