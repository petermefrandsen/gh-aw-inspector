# VS Code Design Guidelines

This document outlines the standard design guidelines for creating webviews and UI components within the `gh-aw-inspector` extension. Our primary goal is to ensure the extension feels completely native to Visual Studio Code.

## Core Principles

1.  **Use Native Components First**: Always prefer the `@vscode/webview-ui-toolkit` over custom HTML/CSS for standard interactive elements (buttons, inputs, dropdowns, checkboxes).
2.  **Respect the Theme**: Never hardcode colors. Always use VS Code CSS variables (`var(--vscode-*)`).
3.  **Adhere to Spacing**: Follow a base-4px/8px spacing scale, consistent with GitHub Primer and VS Code's internal layouts.
4.  **Accessibility**: Ensure sufficient color contrast (provided by theme variables) and maintain keyboard navigability.

## Typography

Visual Studio Code provides specific variables for typography to ensure extensions match the user's editor settings:

*   **Font Family**: `var(--vscode-font-family)`
*   **Font Weight**: Normal (`400`) and Bold (`600`) are standard.
*   **Font Size**: `var(--vscode-font-size)`

## Colors (Theming)

VS Code supports a vast array of themes. To adapt seamlessly, you must use standard color variables.

### Text & Foreground
*   `var(--vscode-foreground)`: Primary text color.
*   `var(--vscode-descriptionForeground)`: Secondary/helper text.
*   `var(--vscode-errorForeground)`: Error text.

### Backgrounds & Panels
*   `var(--vscode-editor-background)`: Main editor area background.
*   `var(--vscode-sideBar-background)`: Sidebar background.
*   `var(--vscode-panel-background)`: Bottom panel background.

### Interactive Elements (When Toolkit isn't possible)
*   `var(--vscode-button-background)`
*   `var(--vscode-button-foreground)`
*   `var(--vscode-button-hoverBackground)`
*   `var(--vscode-focusBorder)`: Essential for accessibility outlines.

## Spacing & Layout

We utilize a base-8 scale (padding/margin in increments of 4px or 8px) to maintain a clean, structured appearance similar to GitHub Primer.

*   **Small**: `4px`
*   **Medium**: `8px`
*   **Large**: `16px`
*   **X-Large**: `24px`

## UI Toolkit Components

For consistent UI, use the [VS Code Webview UI Toolkit](https://github.com/microsoft/vscode-webview-ui-toolkit) for the following elements:

*   `vscode-button` (Primary and Secondary)
*   `vscode-text-field`
*   `vscode-checkbox`
*   `vscode-dropdown` & `vscode-option`
*   `vscode-data-grid` (for tabular data)
*   `vscode-divider`

Example usage in HTML:
```html
<vscode-button appearance="primary">Execute Workflow</vscode-button>
<vscode-text-field placeholder="Enter prompt..."></vscode-text-field>
```

## Foundational CSS

A foundational CSS file is available at `src/webview/styles/vscode-vars.css`. Include this file in your webviews to establish the baseline typography, layout resets, and common utility classes mapped to VS Code themes.
