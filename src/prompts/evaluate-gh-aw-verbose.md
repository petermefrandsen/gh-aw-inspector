# Evaluation Report (Verbose)

> NOTE: This verbose mode requires extra metadata, rationale, and action items. Output must be valid Markdown and include all sections and tables below in the specified order.

## Description
Provide a 2–4 sentence detailed summary describing what the workflow does, its goal, and the typical user or system interacting with it.

## Metadata
Provide the following table and fill values where available (leave blank if unknown):

| Key | Value |
|---|---|
| Required Models | |
| Estimated Duration | |
| Output Format | |
| Trigger | |
| Tools Used | |
| Permissions Required | |
| Confidence Score (%) | |

## Prerequisites
A numbered list of all required setup steps, environment variables, dependencies, or external services. If none, write `None`.

## Intent
A detailed explanation of the instruction or goal given to the LLM agent, including constraints, success criteria, and expected output shape.

## Design Considerations
Discuss architectural trade-offs, prompt-engineering choices, parsing assumptions, retry semantics, external integrations, and any security considerations.

## Example Happy Path Output
Provide a detailed representative example in a fenced code block. If the output is structured (JSON/YAML), present it in that format and annotate key fields after the block.

## Example Unhappy Path Outputs
Provide a bulleted list of failure modes, each with:
- Error or symptom (one-line)
- Likely root cause (one-line)
- Quick mitigation (one-line)

## Actionable Remediation Steps
Provide a numbered list of concrete fixes or debugging steps prioritized from fastest to most involved.

## Improvement Suggestions
Provide 3 concise, prioritized suggestions to improve reliability, observability, or output quality.

## Appendix — Relevant Log Excerpts
Include at most three short log excerpts (fenced code blocks) that are the most useful for debugging, with one-line context captions.

---
**Input CLI Output Context:**
{{CLI_OUTPUT}}
