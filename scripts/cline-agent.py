#!/usr/bin/env python3
"""Marketplace Cline Agent wrapper.

This script uses the installed cline Python library to expose a simple CLI
agent for the repository.
"""

import subprocess
from argparse import ArgumentParser
from typing import IO, List, Optional

from cline.cli.argument_parser_cli import ArgumentParserCli
from cline.cli_args import CommandLineArguments
from cline.exceptions import CannotMakeArguments
from cline.tasks.help import HelpTask
from cline.tasks.task import Task


class RunTaskArgs:
    def __init__(self, task: str, interactive: bool) -> None:
        self.task = task
        self.interactive = interactive


class RunTask(Task[RunTaskArgs]):
    @classmethod
    def make_args(cls, args: CommandLineArguments) -> RunTaskArgs:
        task = args.get_string("task")
        interactive = args.get_bool("interactive", default=False)
        return RunTaskArgs(task=task, interactive=interactive)

    def invoke(self) -> int:
        command = [
            "openhands",
            "--config",
            ".openhands.config.json",
            "--task",
            self.args.task,
        ]

        if not self.args.interactive:
            command.append("--no-interactive")

        print("Running command:", " ".join(command))
        completed = subprocess.run(command)
        return completed.returncode


class ClineAgentCli(ArgumentParserCli):
    def make_parser(self):
        parser = ArgumentParser(
            prog="cline-agent",
            add_help=False,
            description="Marketplace Cline Agent wrapper",
        )
        parser.add_argument("--task", type=str, help="Task description to run")
        parser.add_argument(
            "--interactive",
            action="store_true",
            help="Run OpenHands in interactive mode",
        )
        parser.add_argument("--version", action="store_true", help="Show version")
        parser.add_argument("--help", action="store_true", help="Show help")
        return parser

    def register_tasks(self) -> List[type[Task]]:
        return [RunTask]


def main() -> None:
    ClineAgentCli.invoke_and_exit(app_version="1.0.0")


if __name__ == "__main__":
    main()
