import { getCronDescription } from "./cronUtils";

/**
 * Converts a frontmatter field value into styled HTML badge spans.
 * Handles strings, arrays, and objects. Applies special formatting
 * for "schedule" and "permissions" keys.
 */
export function formatItems(key: string, items: any): string {
    if (!items) { return '<span class="text-secondary-text">None</span>'; }

    let itemArray: { key: string; value: any }[] = [];
    if (typeof items === "string") {
        itemArray = [{ key: items, value: null }];
    } else if (Array.isArray(items)) {
        itemArray = items.map(i => {
            if (typeof i === "object") {
                return { key: JSON.stringify(i), value: i };
            }
            return { key: String(i), value: null };
        });
    } else if (typeof items === "object") {
        itemArray = Object.keys(items).map(k => ({ key: k, value: items[k] }));
    } else {
        itemArray = [{ key: String(items), value: null }];
    }

    let finalHtml = "";
    itemArray.forEach(item => {
        let displayText = item.key;
        let hoverTitle =
            item.value && typeof item.value === "object"
                ? JSON.stringify(item.value, null, 2).replace(/"/gi, "&quot;")
                : item.value
                    ? `${item.key}: ${item.value}`
                    : item.key;

        if (key === "permissions") {
            hoverTitle = item.value ? `${item.key}: ${item.value}` : item.key;
        }

        if (key === "on" || key === "schedule") {
            if (item.key === "schedule" && Array.isArray(item.value)) {
                item.value.forEach((s: any) => {
                    const cronStr = s.cron || String(s);
                    const cronHover = getCronDescription(cronStr);
                    finalHtml += `
            <span class="bg-slate-100 dark:bg-slate-800 text-[11px] px-2 py-0.5 rounded border border-slate-200 dark:border-border-dark flex items-center gap-1 cursor-help" title="${cronHover}">
                <span class="material-symbols-outlined text-[12px]">schedule</span> ${cronStr}
            </span>`;
                });
                return;
            } else if (typeof item.value === "string" && item.value.includes(" ")) {
                hoverTitle = getCronDescription(item.value);
            }
        }

        finalHtml += `
        <span class="bg-slate-100 dark:bg-slate-800 text-[11px] px-2 py-0.5 rounded border border-slate-200 dark:border-border-dark flex items-center gap-1 cursor-help" title="${hoverTitle}">
            <span class="material-symbols-outlined text-[12px]">check</span> ${displayText}
        </span>
    `;
    });

    return finalHtml;
}
