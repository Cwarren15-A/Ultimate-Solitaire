# MCP Server Setup Instructions

## Problem
The MCP_DOCKER server is failing to start with the error:
```
reading secrets: finding secrets [github.personal_access_token notion.internal_integration_token perplexity-ask.api_key]: exit status 125
```

## Root Cause
The MCP_DOCKER server expects secrets to be stored in **Docker Desktop's secret store**, not in environment variables or `.env` files.

## Solution

### Step 1: Ensure Docker Desktop is Running
✅ **Docker Desktop is already running on your system**

### Step 2: Set Secrets in Docker MCP Store
Run the Docker MCP secrets setup script:
```bash
./setup-docker-mcp-secrets.sh
```

This script will prompt you to securely enter your API keys:
- **GitHub Personal Access Token**: Get from [GitHub Settings > Tokens](https://github.com/settings/tokens)
- **Notion Integration Token**: Get from [Notion Integrations](https://www.notion.so/my-integrations)  
- **Perplexity API Key**: Get from [Perplexity Settings](https://www.perplexity.ai/settings/api)

### Alternative Manual Setup
You can also set secrets manually:
```bash
# GitHub token
echo "your_github_token" | docker mcp secret set github.personal_access_token

# Notion token  
echo "your_notion_token" | docker mcp secret set notion.internal_integration_token

# Perplexity key
echo "your_perplexity_key" | docker mcp secret set perplexity-ask.api_key
```

### Step 3: Restart VS Code
Close and reopen VS Code completely to ensure the MCP server picks up the new secrets from Docker's secret store.

### Verification
Check that your secrets are stored:
```bash
docker mcp secret ls
```

You should see the three required secrets listed.

### Alternative Manual Setup
If the script doesn't work, you can manually export the variables in your terminal:

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="your_actual_token"
export NOTION_INTERNAL_INTEGRATION_TOKEN="your_actual_token"
export PERPLEXITY_ASK_API_KEY="your_actual_key"
```

Then restart VS Code from that terminal:
```bash
code .
```

## Verification
After setup, the MCP server should start without the secrets error. You should see successful connection logs instead of the exit status 125 error.

## Troubleshooting
- Make sure your tokens have the correct permissions
- Verify that `.env.local` is not committed to git (it's in `.gitignore`)
- Check that your shell environment is loading the variables correctly
- Try restarting your entire system if VS Code still can't access the variables
