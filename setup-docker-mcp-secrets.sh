#!/bin/zsh

# Docker MCP Secrets Setup Script
# This script sets up the required secrets for MCP_DOCKER server

echo "🔐 Setting up Docker MCP secrets..."

# Function to securely prompt for API keys
prompt_for_secret() {
    local secret_name=$1
    local description=$2
    
    echo "📝 Setting up $secret_name"
    echo "   $description"
    read -s "secret_value?Enter your $secret_name (input hidden): "
    echo
    
    if [[ -n "$secret_value" ]]; then
        echo "$secret_value" | docker mcp secret set "$secret_name"
        echo "✅ $secret_name set successfully"
    else
        echo "⚠️  Skipping $secret_name (no value provided)"
    fi
    echo
}

# Set up each required secret
prompt_for_secret "github.personal_access_token" "Get from: https://github.com/settings/tokens"
prompt_for_secret "notion.internal_integration_token" "Get from: https://www.notion.so/my-integrations"  
prompt_for_secret "perplexity-ask.api_key" "Get from: https://www.perplexity.ai/settings/api"

echo "🔍 Listing all Docker MCP secrets:"
docker mcp secret ls

echo "✅ Docker MCP secrets setup complete!"
echo "🔄 Now restart VS Code for the MCP_DOCKER server to pick up the secrets"
