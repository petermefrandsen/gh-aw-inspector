---
description: Integrating with the GitHub Agentic Workflows CLI (gh aw)
---
# GH AW CLI Integration

This skill documents how the `gh-aw-inspector` VS Code extension must interface with the `gh aw` command-line tool.

## Key Concepts
GitHub Agentic Workflows are defined in Markdown files and converted to GitHub Actions. The CLI provides the interface to manage and test them.

## Supported Commands Mapping
The extension needs to execute these specific commands:

1. **Installation Check**: 
   - Run `gh aw --help` to verify the extension is installed. If it fails, prompt the user to run `gh extension install github/gh-aw`.
   
2. **Discover Workflows**: 
   - Run `gh aw list`. 
   - **Parser Requirement**: The extension must parse the `stdout` of this command. Be prepared to parse either structured text or JSON (if a `--json` flag becomes available). Extract the names and statuses of the workflows.

3. **Compile Workflow**:
   - Run `gh aw compile`. 
   - Executed typically when the user edits a source markdown workflow and wishes to see the translated YAML.

4. **Execute Prompts (Simulation)**: 
   - Run `gh aw run <workflow_name>`. 
   - This command initiates an agentic task. The extension must intercept or mock the prompt inputs, capturing the overall resulting steps.
   - The stdout/stderr from this command is the primary source material for the **Markdown Generator** step, mapping execution logs to "Intent", "Example happy path output", etc.

## Execution Wrapper
Use a utility class `CliExecutor` wrapping `child_process.exec` (or `spawn` for streaming long outputs).
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function runGhAwCommand(args: string): Promise<{stdout: string, stderr: string}> {
    // Implement robust execution, path resolving, and error catching here
}
```
