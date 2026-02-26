# GH AW Inspector: Test Workspace

Welcome to the **Test Workspace** for the `gh-aw-inspector` VS Code extension!

This directory is configured to open automatically when you launch the Extension Development Host (by pressing `F5` in the main workspace). It serves as a clean, isolated environment to test the agentic workflows extension against realistic scenarios and files.

In the broader `gh aw` testing flow, this workspace is the **next step** after CLI execution (`gh aw trial` / `gh aw run`): use it to inspect outcomes in-editor and iterate faster on prompts and workflow behavior.

## 🚀 Purpose

The goal of this workspace is to provide a "sandbox" where you can safely:
- **Test UI Components**: Verify how the sidebar, trees, and panels render.
- **Run Simulations**: Test the simulated execution of prompts against sample agentic workflows.
- **Debug End-to-End**: Ensure the extension properly reads workspace files, parses markdown frontmatter, and executes `gh aw` CLI commands.
- **Bridge CLI to Editor Testing**: Move from terminal test runs into structured inspection and evaluation within VS Code.

---

## 📂 Included Test Workflows

To make testing realistic and fruitful immediately upon launch, this workspace comes pre-populated with several example Agentic Workflows located in `.github/workflows/shared/`:

### 1. Daily Security Red Team (`daily-security-red-team.md`)
A complex, multi-phase agentic workflow designed for deep security analysis. 
- **Tracker ID**: `security-red-team`
- **Engine**: Claude
- **Highlights**: Demonstrates advanced cache utilization, multi-step bash execution, dynamic technique rotation, and forensic commit analysis. Use this to test the simulator's ability to handle long, complex markdown reports and tool usage (`github`, `edit`, `bash`).

### 2. Reporting Guidelines (`reporting.md`)
A shared import module containing structural guidelines for Agentic outputs.
- **Highlights**: Demonstrates the `imports` feature of `gh-aw`. Use this to test if the extension properly resolves imported markdown modules when compiling workflows.

---

## 🧪 How to use this workspace

1. Launch the `gh-aw-inspector` extension from the main codebase (Press `F5`).
2. This folder will automatically open in the Extension Development Host.
3. Open the **"GH Agentic Workflows"** sidebar (the GitHub icon or your custom SVG).
4. Utilize the UI to list the workflows found in `.github`.
5. Run a simulation against `daily-security-red-team` to view the split-panel reporting in action!

*Feel free to add or modify `.md` files here to continuously test edge cases without cluttering the main extension repository!*
