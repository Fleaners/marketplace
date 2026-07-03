# OpenHands Integration Guide for Marketplace Project

## Quick Start (5 minutes)

### 1. Set Your API Key
```powershell
$env:OPENAI_API_KEY = "sk-..."  # Your OpenAI API key
```

### 2. Verify Installation
```bash
openhands --version
```

### 3. Run Your First Task
```bash
openhands --task "List the project structure and suggest improvements"
```

## Integration with Your Project

OpenHands is configured to work with your marketplace project structure:

```
next_app/          ← Next.js frontend (main focus)
backend/           ← Node.js backend services
functions/         ← Firebase cloud functions
web_app/           ← Legacy web application
flutter_app/       ← Flutter mobile app
scripts/           ← Test and automation scripts
```

## Running Tasks from VS Code

### Using PowerShell Script
```powershell
# From terminal in VS Code
./scripts/run-openhands.ps1 -Task "Fix the authentication dialog"

# Interactive mode (shows all steps)
./scripts/run-openhands.ps1 -Task "Run smoke tests" -Interactive
```

### Direct CLI
```bash
openhands --task "Your task description"
```

## Real-World Examples for Your Project

### 1. Fix Authentication Issues
```bash
openhands --task "Debug the authentication flow E2E test in scripts/auth-flow.e2e.spec.ts. The test is failing on the Google OAuth dialog. Fix the issue and verify with the smoke tests."
```

### 2. Optimize Next.js Build
```bash
openhands --task "Analyze the Next.js build performance in next_app/, identify bottlenecks, and optimize the configuration and code."
```

### 3. Update Dependencies
```bash
openhands --task "Update all npm dependencies to latest versions, fix any breaking changes, and verify tests still pass."
```

### 4. Add New Feature
```bash
openhands --task "Create a new React component for seller analytics dashboard in next_app/components/AnalyticsDashboard.tsx with TypeScript types and Firebase integration."
```

### 5. Migrate Code
```bash
openhands --task "Migrate the legacy seller wizard from web_app/seller-next.js to a modern React component in next_app/components/SellerWizard.tsx"
```

### 6. Fix Security Issues
```bash
openhands --task "Review SECURITY.md, scan the codebase for vulnerabilities using gitleaks and other tools, and fix any issues found."
```

### 7. Deploy to Production
```bash
openhands --task "Build the entire project, run all tests, and deploy to Firebase hosting and functions."
```

## Configuration Files

### .openhands.config.json
Main configuration file with:
- LLM settings (model, temperature, tokens)
- Workspace access restrictions
- Security limits (timeouts, max iterations)
- Environment variables

### .env.openhands
Environment variables for:
- OpenAI API keys
- Firebase credentials
- Agent behavior settings
- Development environment

## Monitoring and Debugging

### View Agent Actions
OpenHands shows all commands it runs:
```
[Agent] Running: npm install
[Agent] Modifying: next_app/components/NewComponent.tsx
[Agent] Running: npm test
```

### Stop an Agent
Press `Ctrl+C` in the terminal to stop the agent

### Check Logs
Logs are saved in:
```
logs/openhands/
```

## Advanced Usage

### Custom Configuration
Override settings for specific tasks:
```bash
openhands --config .openhands.config.json --task "..." --timeout 600
```

### Docker Execution
Run OpenHands in an isolated container:
```bash
docker build -f Dockerfile.openhands -t marketplace-openhands .
docker run -it \
  -e OPENAI_API_KEY=$env:OPENAI_API_KEY \
  -v "$(pwd):/app" \
  marketplace-openhands \
  --task "Your task"
```

### Batch Operations
Run multiple tasks sequentially:
```bash
# Create a tasks.txt file with one task per line
openhands --batch tasks.txt
```

## Troubleshooting

### Issue: "OpenHands not found"
**Solution:** Install with `pip install openhands`

### Issue: "API key not set"
**Solution:** 
```powershell
$env:OPENAI_API_KEY = "sk-..."
```

### Issue: Agent timeout or stuck
**Solution:** Increase timeout in .openhands.config.json or break task into smaller steps

### Issue: Permission denied on file modifications
**Solution:** Check that the file is in an `allowed_dirs` in configuration

### Issue: Agent makes unwanted changes
**Solution:** Use `--no-execute` flag to preview changes first

## Safety Practices

1. **Always Use Git**
   ```bash
   git add .
   git commit -m "Checkpoint before OpenHands task"
   ```

2. **Review Changes**
   After agent completes, review the diff:
   ```bash
   git diff
   ```

3. **Test Before Committing**
   ```bash
   npm test
   npm run build
   ```

4. **Use Read-Only Mode for Exploration**
   ```bash
   openhands --task "Analyze code" --read-only
   ```

## Resource Links

- [OpenHands GitHub](https://github.com/All-Hands-AI/OpenHands)
- [OpenAI Documentation](https://platform.openai.com/docs)
- [Your Project README](./README.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Security Policy](./SECURITY.md)

---

**Need Help?** Check OPENHANDS_PROMPTS.md for more example tasks.
