import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";

/**
 * Recursively resolves `imports:` references in a workflow's frontmatter.
 * Returns files in dependency-first order (imports before the referencing file),
 * with duplicates removed via the `visited` set.
 */
export function resolveImports(
    filePath: string,
    visited = new Set<string>()
): { filePath: string; content: string }[] {
    const abs = path.resolve(filePath);
    if (visited.has(abs)) { return []; }
    visited.add(abs);

    let fileContent = "";
    try {
        fileContent = fs.readFileSync(abs, "utf8");
    } catch {
        return [];
    }

    let parsed: matter.GrayMatterFile<string>;
    try {
        parsed = matter(fileContent);
    } catch {
        return [{ filePath: abs, content: fileContent }];
    }

    const imports: string[] = Array.isArray(parsed.data?.imports)
        ? parsed.data.imports
        : [];
    const dir = path.dirname(abs);

    const results: { filePath: string; content: string }[] = [];
    for (const imp of imports) {
        const importPath = path.resolve(dir, imp);
        const nested = resolveImports(importPath, visited);
        results.push(...nested);
    }

    // Self last — dependencies come first
    results.push({ filePath: abs, content: fileContent });
    return results;
}
