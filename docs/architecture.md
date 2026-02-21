# GH AW Inspector Architecture

The overarching goal is to parse and simulate CLI commands in a sandboxed or mocked VS Code extension environment.

## Components
1. **Extension Entry Point (`extension.ts`)**: Registers commands, sets up the tree views, and manages state.
2. **Sidebar View**: Discovers available `gh-aw` workflows and presents them.
3. **Execution Simulator**: Spawns terminal tasks or child processes interacting with the actual CLI, parsing outputs back into Webview or Output channel.
4. **Markdown Generator**: Formats the returned outputs into rich markdown files.

*(Note: Specifics pending implementation phase)*
