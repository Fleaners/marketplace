# OpenHands Agent Canvas - Local Implementation

## What is Agent Canvas?

Agent Canvas is a visual interface and task execution dashboard for OpenHands AI agent. It provides:
- **Interactive task input** - Create tasks in a visual canvas
- **Task tracking** - Monitor task status and history
- **Execution dashboard** - See real-time task updates
- **Integration layer** - Connect to OpenHands seamlessly

## Installation (Local)

We've installed a **local version** of agent-canvas that works immediately without external dependencies.

### Files Created
- `scripts/agent-canvas.js` - Main canvas application
- `scripts/agent-canvas.ps1` - Windows PowerShell launcher
- `scripts/agent-canvas.sh` - Linux/Mac launcher

## Quick Start

### Windows (PowerShell)
```powershell
# Set API key
$env:OPENAI_API_KEY = "sk-your-key"

# Run interactive canvas
./scripts/agent-canvas.ps1

# Or run with specific task
./scripts/agent-canvas.ps1 --task "Analyze project structure"
```

### Linux/Mac
```bash
# Set API key
export OPENAI_API_KEY="sk-your-key"

# Run interactive canvas
./scripts/agent-canvas.sh

# Or run with specific task
./scripts/agent-canvas.sh --task "Analyze project structure"
```

## Usage Examples

### Interactive Mode
```powershell
./scripts/agent-canvas.ps1
# Then enter your task at the prompt
```

### Command Line Mode
```powershell
./scripts/agent-canvas.ps1 --task "Fix authentication errors"
```

### With OpenHands Integration
```powershell
# Terminal 1: Launch canvas
./scripts/agent-canvas.ps1 --task "Run smoke tests"

# Terminal 2: Run OpenHands with same task
$env:OPENAI_API_KEY = "sk-..."
openhands --task "Run smoke tests"
```

## Canvas Features

### Task Display
- Shows all tasks with status (pending, running, completed)
- Displays task creation time
- Shows task count and completion progress

### Status Indicators
- `▶` Running task
- `✓` Completed task
- `○` Pending task

### Color Coded Output
- 🔵 Blue: Information messages
- 🟢 Green: Success messages  
- 🟡 Yellow: Running/Active tasks
- 🔴 Red: Error messages
- ⚪ Dim: Inactive/pending tasks

## Integration with OpenHands

### Workflow

1. **Open Agent Canvas**
   ```powershell
   ./scripts/agent-canvas.ps1
   ```

2. **Enter Your Task**
   ```
   > Analyze the marketplace project structure and suggest improvements
   ```

3. **Canvas Shows Task Status**
   ```
   ▶ Task 1: Analyze the marketplace project structure and suggest improvements
   Status: running
   ```

4. **Run OpenHands in Another Terminal**
   ```powershell
   $env:OPENAI_API_KEY = "sk-..."
   openhands --task "Analyze the marketplace project structure and suggest improvements"
   ```

5. **Monitor Progress**
   - Canvas updates in real-time
   - View task output and status changes
   - Track completion

## Real-World Examples

### Example 1: Fix Authentication Bug
```powershell
# Terminal 1
./scripts/agent-canvas.ps1 --task "Fix the authentication dialog not showing in Firefox"

# Terminal 2
$env:OPENAI_API_KEY = "sk-..."
openhands --task "Fix the authentication dialog not showing in Firefox"
```

### Example 2: Run and Fix Tests
```powershell
# Terminal 1
./scripts/agent-canvas.ps1 --task "Run smoke tests and fix failures"

# Terminal 2
$env:OPENAI_API_KEY = "sk-..."
openhands --task "Run smoke tests and fix failures"
```

### Example 3: Generate Code
```powershell
# Terminal 1
./scripts/agent-canvas.ps1 --task "Create new React component for product filters"

# Terminal 2
$env:OPENAI_API_KEY = "sk-..."
openhands --task "Create new React component for product filters in next_app/components"
```

## Configuration

Edit `.openhands.config.json` to customize:
- Allowed directories for agent access
- Security limits (timeouts, max iterations)
- LLM model settings
- Environment variables

## Troubleshooting

### "Node.exe not found" error
Make sure Node.js is installed:
```powershell
node --version
```

### Canvas not displaying
Try running with explicit Node path:
```powershell
C:\Users\ELCOT\AppData\Local\hermes\hermes-agent\venv\Scripts\node.exe scripts/agent-canvas.js
```

### Task not connecting to OpenHands
1. Verify `OPENAI_API_KEY` is set
2. Check `.openhands.config.json` exists
3. Ensure OpenHands is installed: `openhands --version`

## Next Steps

1. **Set your API key** (one-time)
   ```powershell
   $env:OPENAI_API_KEY = "sk-your-openai-key"
   ```

2. **Try the canvas**
   ```powershell
   ./scripts/agent-canvas.ps1
   ```

3. **Use with OpenHands**
   ```powershell
   openhands --task "Your task description"
   ```

## Files Reference

- `scripts/agent-canvas.js` - Core application (Node.js)
- `scripts/agent-canvas.ps1` - Windows launcher
- `scripts/agent-canvas.sh` - Unix launcher
- `.openhands.config.json` - Configuration
- `OPENHANDS_SETUP.md` - OpenHands setup
- `OPENHANDS_INTEGRATION.md` - Integration guide

## Additional Resources

- [OpenHands GitHub](https://github.com/All-Hands-AI/OpenHands)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Project README](./README.md)
- [Deployment Guide](./DEPLOYMENT.md)

---

**Ready to use!** Agent Canvas is now installed locally and ready to integrate with OpenHands. 🚀
