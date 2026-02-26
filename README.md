# GH AW Inspector

![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/petermefrandsen/bab8e824bc6f612de3666fe6a8a8c49e/raw/gh-aw-inspector-coverage.json)

**GH AW Inspector** is a VS Code extension that can use any agentic / AI CLI under the hood, but is specifically tailored for inspecting and simulating the GitHub Agentic Workflows CLI (`gh aw`). GitHub Agentic Workflows enable users to define and execute tasks using AI agents within GitHub Actions using Markdown files.

This extension provides a dedicated interface within VS Code to inspect, run, and simulate these tools without leaving your editor.

For teams following the official CLI testing flow, this extension is intended as the **next step** after terminal-first testing (`gh aw trial` / `gh aw run`): use the editor experience to inspect runs, compare outcomes, and generate structured simulation/evaluation notes.

## Motivation & Features
- **Sidebar Commands**: Quickly execute common `gh aw` CLI commands:
  - `gh aw init`: Sets up a repository for agentic workflows.
  - `gh aw list`: List all active agentic workflows in the current repository.
  - `gh aw compile`: Converts Markdown workflow files into GitHub Actions YAML.
- **Testing Next Step in VS Code**: Complement CLI testing by moving from `gh aw trial` and `gh aw run` into a richer editor workflow for inspection, prompt iteration, and report generation.
- **Simulate Outputs**: Execute predefined prompts against specific workflows (selected via a dropdown using `gh aw run <workflow>`) and simulate their output locally before committing.
- **Auto-generated Markdown**: Output simulation is captured and structured elegantly into Markdown with:
  - **Description**: What the workflow ran.
  - **Metadata**: Timestamps, models used, duration.
  - **Prerequisites**: Necessary dependencies or states.
  - **Intent**: The goal of the prompt.
  - **Example happy path output**: Successful execution logs.
  - **Example unhappy path outputs**: Common failures and errors.

## Development & Setup
Please see [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started locally. Note that agentic development instructions (AI Skills) are located in `.github/skills/`.

*Note: The core extension logic is still pending implementation. Prompts are located in `src/prompts/`.*
