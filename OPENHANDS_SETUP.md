# OpenHands AI Agent Setup

OpenHands is now configured for this marketplace project as a development assistant that can help with:
- **Code Generation & Refactoring**: Autonomous code modifications and improvements
- **Testing**: Running and debugging tests (Playwright, unit tests)
- **Build & Deployment**: Automating build processes and Firebase deployments
- **Bug Fixing**: Investigating and fixing issues in the codebase

## Installation

### 1. Install OpenHands CLI

```bash
pip install openhands
```

Or using npm wrapper:
```bash
npm install -g @openhands/openhands-cli
```

### 2. Configure API Keys

Set your LLM API key (OpenAI GPT-4 by default):
```bash
export OPENAI_API_KEY=your_api_key_here
```

For Windows PowerShell:
```powershell
$env:OPENAI_API_KEY="your_api_key_here"
```

## Quick Start

### Run OpenHands in Interactive Mode

```bash
openhands
```

### Run with Specific Task

```bash
openhands --task "Fix the authentication dialog in the marketplace app"
```

### Run with Configuration File

```bash
openhands --config .openhands.config.json --task "Run the smoke tests"
```

## Common Tasks

### Generate Code
```bash
openhands --task "Create a new React component for product filters in next_app/components"
```

### Run Tests
```bash
openhands --task "Run all playwright tests in scripts/smoke-test.spec.ts and report results"
```

### Fix Bugs
```bash
openhands --task "Debug and fix the authentication flow E2E test failures"
```

### Deploy
```bash
openhands --task "Deploy the Next.js app to Firebase hosting"
```

## Project Structure for OpenHands

The agent has access to these directories:
- `next_app/` - Next.js marketplace frontend
- `backend/` - Backend services
- `functions/` - Firebase cloud functions
- `web_app/` - Legacy web app
- `flutter_app/` - Flutter mobile app
- `scripts/` - Automation scripts and tests

## Configuration Options

See `.openhands.config.json` for detailed configuration:
- `llm` - Language model settings
- `workspace` - Directory access restrictions
- `capabilities` - Feature toggles
- `security` - Safety limits and timeouts

## Best Practices

1. **Be Specific**: Provide clear, detailed task descriptions
2. **Monitor Output**: Watch the agent's work and intervene if needed
3. **Test Changes**: Always verify changes with existing tests
4. **Version Control**: Keep git updated before running large tasks
5. **Review Changes**: Review all generated code before committing

## Troubleshooting

### Agent Stuck or Timeout
- Increase `timeout_seconds` in `.openhands.config.json`
- Simplify the task into smaller subtasks

### Permission Errors
- Check that `allowed_dirs` includes your target directory
- Verify Node.js/Python environment is properly set up

### API Errors
- Verify `OPENAI_API_KEY` is set correctly
- Check model availability and quota

## Resources

- [OpenHands Documentation](https://github.com/All-Hands-AI/OpenHands)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
