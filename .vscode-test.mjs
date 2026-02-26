import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
    files: 'out/test/suite/**/*.test.js',
    workspaceFolder: './test-workspace',
    mocha: {
        ui: 'tdd',
        timeout: 20000
    },
    coverage: {
        includeAll: true,
        exclude: [
            'out/test/**',
            'out/panels/SimulationPanel.js'
        ],
        reporter: ['text', 'lcov', 'html', 'cobertura']
    }
});
