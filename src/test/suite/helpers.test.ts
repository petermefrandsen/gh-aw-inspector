import * as assert from 'assert';
import * as path from 'path';
import { getCronDescription } from '../../utils/cronUtils';
import { formatItems } from '../../utils/formatItems';
import { resolveImports } from '../../utils/importResolver';

// Resolve paths relative to the compiled output location: out/test/suite/ -> workspace root
const WORKSPACE_ROOT = path.resolve(__dirname, '../../../');
const MAIN_WORKFLOW = path.join(WORKSPACE_ROOT, 'test-workspace', '.github', 'workflows', 'daily-security-red-team.md');

suite('getCronDescription', () => {

    test('returns human-readable description for a valid weekday cron', () => {
        const result = getCronDescription('0 9 * * 1-5');
        assert.ok(result.length > 0, 'should return a non-empty string');
        assert.notStrictEqual(result, 'Invalid Cron', 'should not return error for a valid cron');
        assert.ok(result.toLowerCase().includes('9'), 'description should reference the hour');
    });

    test('returns human-readable description for midnight daily cron', () => {
        const result = getCronDescription('0 0 * * *');
        assert.notStrictEqual(result, 'Invalid Cron');
        assert.ok(result.toLowerCase().includes('12') || result.toLowerCase().includes('midnight') || result.toLowerCase().includes('0'), 'should reference midnight/hour 0');
    });

    test('returns "Invalid Cron" for a nonsense string', () => {
        assert.strictEqual(getCronDescription('not-a-cron'), 'Invalid Cron');
    });

    test('returns "Invalid Cron" for an empty string', () => {
        assert.strictEqual(getCronDescription(''), 'Invalid Cron');
    });

    test('returns "Invalid Cron" for an incomplete cron expression', () => {
        assert.strictEqual(getCronDescription('* *'), 'Invalid Cron');
    });
});

suite('formatItems', () => {

    test('returns None span for null/undefined/falsy', () => {
        assert.ok(formatItems('name', null).includes('None'));
        assert.ok(formatItems('name', undefined).includes('None'));
        assert.ok(formatItems('name', '').includes('None'));
    });

    test('wraps a simple string value in a badge span', () => {
        const html = formatItems('engine', 'claude');
        assert.ok(html.includes('claude'), 'should include the value text');
        assert.ok(html.includes('<span'), 'should produce HTML span elements');
    });

    test('wraps each element of a string array in its own badge', () => {
        const html = formatItems('tools', ['bash', 'web-fetch', 'github']);
        assert.ok(html.includes('bash'));
        assert.ok(html.includes('web-fetch'));
        assert.ok(html.includes('github'));
    });

    test('expands object keys into individual badges', () => {
        const html = formatItems('permissions', { issues: 'write', contents: 'read' });
        assert.ok(html.includes('issues'));
        assert.ok(html.includes('contents'));
    });

    test('permissions key sets hover title to "key: value" format', () => {
        const html = formatItems('permissions', { issues: 'write' });
        assert.ok(html.includes('issues: write'), 'hover title should include the scope value');
    });

    test('schedule key with cron array renders cron expressions and descriptions', () => {
        const schedule = [{ cron: '0 9 * * 1-5' }];
        const html = formatItems('on', { schedule });
        assert.ok(html.includes('0 9 * * 1-5'), 'should include the raw cron string');
        assert.ok(html.includes('schedule'), 'should include schedule icon');
    });

    test('handles numeric values by coercing to string', () => {
        const html = formatItems('timeout-minutes', 60);
        assert.ok(html.includes('60'));
    });

    test('array containing objects JSON-stringifies the object items', () => {
        const html = formatItems('tools', [{ name: 'bash', version: '1.0' }, 'curl']);
        assert.ok(html.includes('curl'), 'should include plain string item');
        assert.ok(html.includes('name'), 'should include key from JSON-stringified object');
    });

    test('on key with object value having a string cron applies getCronDescription as hover', () => {
        // schedule value is a plain string with spaces → triggers the getCronDescription branch
        const html = formatItems('on', { schedule: '0 9 * * 1-5' });
        assert.ok(html.includes('schedule'), 'badge should show the schedule key');
    });
});

suite('resolveImports', () => {

    test('returns empty array for a non-existent file path', () => {
        const result = resolveImports('/nonexistent/path/to/file.md');
        assert.deepStrictEqual(result, []);
    });

    test('returns single entry for a file with no imports', () => {
        const result = resolveImports(
            path.join(WORKSPACE_ROOT, 'test-workspace', '.github', 'workflows', 'shared', 'reporting.md')
        );
        assert.strictEqual(result.length, 1, 'should return exactly one entry');
        assert.ok(result[0].filePath.endsWith('reporting.md'), 'entry should be the file itself');
        assert.ok(result[0].content.length > 0, 'content should not be empty');
    });

    test('returns dependency-first order: imported file before referencing file', () => {
        const result = resolveImports(MAIN_WORKFLOW);
        assert.ok(result.length >= 2, 'should return at least two entries (import + main file)');

        const paths = result.map(r => r.filePath);
        const reportingIndex = paths.findIndex(p => p.includes('reporting.md'));
        const mainIndex = paths.findIndex(p => p.includes('daily-security-red-team.md'));

        assert.ok(reportingIndex !== -1, 'result should include reporting.md');
        assert.ok(mainIndex !== -1, 'result should include daily-security-red-team.md');
        assert.ok(reportingIndex < mainIndex, 'reporting.md (dependency) must appear before daily-security-red-team.md');
    });

    test('does not include duplicate files when the same import is referenced twice', () => {
        const result = resolveImports(MAIN_WORKFLOW);
        const paths = result.map(r => r.filePath);
        const unique = new Set(paths);
        assert.strictEqual(paths.length, unique.size, 'no duplicate file entries should be present');
    });

    test('returned entries include full file content', () => {
        const result = resolveImports(MAIN_WORKFLOW);
        for (const entry of result) {
            assert.ok(typeof entry.content === 'string' && entry.content.length > 0,
                `entry for ${entry.filePath} should have non-empty content`);
        }
    });
});
