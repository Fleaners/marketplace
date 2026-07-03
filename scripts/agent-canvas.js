#!/usr/bin/env node
/**
 * OpenHands Agent Canvas - Local CLI Interface
 * Provides visual canvas for OpenHands AI agent task execution
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const CANVAS_CONFIG = {
  projectRoot: process.cwd(),
  maxHistoryLines: 100,
  canvasWidth: 80,
  colors: {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
  }
};

class OpenHandsCanvas {
  constructor() {
    this.tasks = [];
    this.currentTask = null;
    this.isRunning = false;
    this.canvas = [];
  }

  // Clear screen
  clear() {
    console.clear();
  }

  // Draw header
  drawHeader() {
    const header = `
╔════════════════════════════════════════════════════════════════════════════╗
║          OpenHands AI Agent Canvas - Task Execution Dashboard             ║
╚════════════════════════════════════════════════════════════════════════════╝
    `;
    console.log(`${CANVAS_CONFIG.colors.cyan}${header}${CANVAS_CONFIG.colors.reset}`);
  }

  // Draw task input prompt
  async promptForTask() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(`\n${CANVAS_CONFIG.colors.blue}Enter your task for OpenHands:${CANVAS_CONFIG.colors.reset}\n> `, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  // Draw task card
  drawTaskCard(task, index) {
    const statusIcon = task.status === 'running' ? '▶' : task.status === 'completed' ? '✓' : '○';
    const statusColor = task.status === 'running' ? CANVAS_CONFIG.colors.yellow : 
                       task.status === 'completed' ? CANVAS_CONFIG.colors.green : 
                       CANVAS_CONFIG.colors.dim;
    
    console.log(`\n${statusColor}${statusIcon} Task ${index + 1}: ${task.name}${CANVAS_CONFIG.colors.reset}`);
    console.log(`  Status: ${statusColor}${task.status}${CANVAS_CONFIG.colors.reset}`);
    console.log(`  Created: ${task.timestamp}`);
  }

  // Draw canvas
  drawCanvas() {
    this.clear();
    this.drawHeader();
    
    console.log(`${CANVAS_CONFIG.colors.cyan}═══ TASKS ═══${CANVAS_CONFIG.colors.reset}`);
    
    if (this.tasks.length === 0) {
      console.log(`${CANVAS_CONFIG.colors.dim}No tasks yet${CANVAS_CONFIG.colors.reset}`);
    } else {
      this.tasks.forEach((task, index) => {
        this.drawTaskCard(task, index);
      });
    }

    console.log(`\n${CANVAS_CONFIG.colors.cyan}═══ STATUS ═══${CANVAS_CONFIG.colors.reset}`);
    console.log(`Active Tasks: ${this.tasks.filter(t => t.status === 'running').length}`);
    console.log(`Completed: ${this.tasks.filter(t => t.status === 'completed').length}`);
  }

  // Add task
  addTask(name) {
    const task = {
      id: Date.now(),
      name,
      status: 'pending',
      timestamp: new Date().toLocaleString(),
      output: []
    };
    this.tasks.push(task);
    return task;
  }

  // Update task status
  updateTaskStatus(taskId, status, output = null) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      if (output) {
        task.output.push(output);
      }
    }
  }

  // Display help
  showHelp() {
    console.log(`
${CANVAS_CONFIG.colors.bright}OpenHands Agent Canvas - Available Commands:${CANVAS_CONFIG.colors.reset}

${CANVAS_CONFIG.colors.green}agent-canvas${CANVAS_CONFIG.colors.reset} - Start interactive canvas
${CANVAS_CONFIG.colors.green}agent-canvas --help${CANVAS_CONFIG.colors.reset} - Show this help
${CANVAS_CONFIG.colors.green}agent-canvas --version${CANVAS_CONFIG.colors.reset} - Show version
${CANVAS_CONFIG.colors.green}agent-canvas --task "description"${CANVAS_CONFIG.colors.reset} - Run specific task

${CANVAS_CONFIG.colors.bright}Example:${CANVAS_CONFIG.colors.reset}
  agent-canvas --task "Analyze the project structure"

${CANVAS_CONFIG.colors.bright}Integration with OpenHands:${CANVAS_CONFIG.colors.reset}
  This canvas provides a visual interface for executing OpenHands tasks.
  Use with: openhands --task "your task description"
    `);
  }

  // Run interactive mode
  async run() {
    this.drawCanvas();
    
    const task = await this.promptForTask();
    
    if (!task) {
      console.log(`${CANVAS_CONFIG.colors.red}No task provided${CANVAS_CONFIG.colors.reset}`);
      process.exit(1);
    }

    const newTask = this.addTask(task);
    this.updateTaskStatus(newTask.id, 'running', 'Task initialized...');
    this.drawCanvas();

    console.log(`\n${CANVAS_CONFIG.colors.yellow}Executing task with OpenHands...${CANVAS_CONFIG.colors.reset}`);
    console.log(`${CANVAS_CONFIG.colors.dim}Command: openhands --task "${task}"${CANVAS_CONFIG.colors.reset}\n`);

    // Instructions for user
    console.log(`${CANVAS_CONFIG.colors.bright}Next step:${CANVAS_CONFIG.colors.reset}`);
    console.log(`Run in another terminal: openhands --task "${task}"\n`);

    this.updateTaskStatus(newTask.id, 'completed', 'Task canvas ready for execution');
    this.drawCanvas();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const canvas = new OpenHandsCanvas();

  if (args.length === 0) {
    // Interactive mode
    await canvas.run();
  } else if (args[0] === '--help') {
    canvas.showHelp();
  } else if (args[0] === '--version') {
    console.log('OpenHands Agent Canvas v1.0.0');
  } else if (args[0] === '--task' && args[1]) {
    // Direct task mode
    const task = args[1];
    const newTask = canvas.addTask(task);
    canvas.updateTaskStatus(newTask.id, 'running');
    canvas.drawCanvas();
    console.log(`\n${CANVAS_CONFIG.colors.yellow}Task ready for execution${CANVAS_CONFIG.colors.reset}`);
    console.log(`Run: openhands --task "${task}"\n`);
  } else {
    canvas.showHelp();
  }
}

main().catch(console.error);
