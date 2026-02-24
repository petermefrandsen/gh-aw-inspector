import cronstrue from "cronstrue";

/**
 * Returns a human-readable description of a cron expression.
 * Returns "Invalid Cron" if the expression cannot be parsed.
 */
export function getCronDescription(cronStr: string): string {
    try {
        return cronstrue.toString(cronStr);
    } catch {
        return "Invalid Cron";
    }
}
