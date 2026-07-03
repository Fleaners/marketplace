# OpenHands Quick Reference Card

## Installation (One-time)
```powershell
pip install openhands
```

## Setup API Key (One-time)
```powershell
# PowerShell
$env:OPENAI_API_KEY = "sk-your-key-here"

# Or add to Windows Environment Variables GUI
```

## Run from Command Line
```bash
# Basic task
openhands --task "Fix authentication errors"

# With config
openhands --config .openhands.config.json --task "Your task"

# Interactive mode
openhands --task "Your task" -i
```

## Run from PowerShell Script
```powershell
./scripts/run-openhands.ps1 -Task "Your task description"

# Interactive
./scripts/run-openhands.ps1 -Task "Your task" -Interactive
```

## VS Code Tasks (Ctrl+Shift+B)
- **OpenHands: Run Custom Task** - Prompts for your task
- **OpenHands: Check Installation** - Verify OpenHands is installed
- **OpenHands: Fix Authentication** - Fix auth test failures
- **OpenHands: Run Tests & Fix** - Run smoke tests and fix
- **OpenHands: Security Scan** - Find and fix vulnerabilities

## Common Tasks

### Fix Tests
```bash
openhands --task "Run smoke tests in scripts/smoke-test.spec.ts and fix failures"
```

### Add Feature
```bash
openhands --task "Create new React component for product filters in next_app/components"
```

### Refactor Code
```bash
openhands --task "Refactor the authentication service to use async/await patterns"
```

### Deploy
```bash
openhands --task "Build and deploy to Firebase hosting"
```

### Security
```bash
openhands --task "Scan for vulnerabilities and fix security issues"
```

## Stop Agent
Press `Ctrl+C` in terminal

## Verify Setup
```bash
openhands --version
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "OpenHands not found" | `pip install openhands` |
| "API key not set" | `$env:OPENAI_API_KEY = "sk-..."` |
| Agent stuck/timeout | Press Ctrl+C, try simpler task |
| Permission errors | Check .openhands.config.json allowed_dirs |

## Full Documentation
- **Setup**: Read `OPENHANDS_SETUP.md`
- **Integration**: Read `OPENHANDS_INTEGRATION.md`
- **Examples**: Read `OPENHANDS_PROMPTS.md`
- **Config**: Edit `.openhands.config.json`

## Where Are the Files?
- Config: `.openhands.config.json`
- Env vars: `.env.openhands`
- Runner script: `scripts/run-openhands.ps1`
- Docker: `Dockerfile.openhands`
- VS Code tasks: `.vscode/tasks.json`

---
**Pro Tip**: Start simple with `openhands --task "Analyze the project structure"` to see how it works!
