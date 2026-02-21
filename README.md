# GH AW Inspector

**GH AW Inspector** is a VS Code extension designed to interface with the GitHub Agentic Workflows CLI (`gh aw`). GitHub Agentic Workflows enable users to define and execute tasks using AI agents within GitHub Actions using Markdown files.

This extension provides a dedicated interface within VS Code to inspect, run, and simulate these workflows without leaving your editor.

## Motivation & Features
- **Sidebar Commands**: Quickly execute common `gh aw` CLI commands:
  - `gh aw init`: Sets up a repository for agentic workflows.
  - `gh aw list`: List all active agentic workflows in the current repository.
  - `gh aw compile`: Converts Markdown workflow files into GitHub Actions YAML.
- **Simulate Outputs**: Execute predefined prompts against specific workflows (selected via a dropdown using `gh aw run <workflow>`) and simulate their output locally before committing.
- **Auto-generated Markdown**: Output simulation is captured and structured elegantly into Markdown with:
  - **Description**: What the workflow ran.
  - **Metadata**: Timestamps, models used, duration.
  - **Prerequisites**: Necessary dependencies or states.
  - **Intent**: The goal of the prompt.
  - **Example happy path output**: Successful execution logs.
  - **Example unhappy path outputs**: Common failures and errors.

## Development & Setup
Please see [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started locally. 

*Note: The core extension logic is still pending implementation.*
