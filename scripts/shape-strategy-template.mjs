export const ORCHESTRATION_DIR = ".codex-orchestration";
export const SOURCE_STRATEGY_RELATIVE_DIR = "strategies/shape-strategy";
export const LEGACY_STRATEGY_RELATIVE_DIR = "strategies/shape-strategy";
export const ARCHITECTURE_FILENAME = "architecture.md";
export const GUIDE_DIR = "_guides";
export const TEMPLATES_DIR = "_templates";
export const STRATEGY_EXPERIMENTS_DIR = "_strategies";
export const LEGACY_META_DIR = "meta";
export const PRESSURE_LEDGER_FILENAME = "pressure-ledger.md";
export const STRATEGY_MAP_LINE = "- Strategy map: `map.md`";
export const ACCEPTED_STRATEGY_LINE =
  "- Accepted strategy: `_guides/orchestration-shape-strategy.md`";
export const STRATEGY_GUIDE_LINE = "- Strategy guide: `_guides/`";
export const STRATEGY_TEMPLATES_LINE = "- Strategy templates: `_templates/`";
export const PRESSURE_LEDGER_LINE = "- Pressure ledger: `pressure-ledger.md`";
export const SHAPE_RUN_RETURN_LINE =
  "- Return workflow skill: `$shape-run-return` in `$CODEX_HOME/skills/shape-run-return/`";
export const LEGACY_ACCEPTED_STRATEGY_LINE = `- Accepted strategy: \`${LEGACY_STRATEGY_RELATIVE_DIR}/meta/orchestration-shape-strategy.md\``;
export const LEGACY_GUIDE_ACCEPTED_STRATEGY_LINE = `- Accepted strategy: \`${LEGACY_STRATEGY_RELATIVE_DIR}/guide/orchestration-shape-strategy.md\``;
export const LEGACY_UNDERSCORE_ACCEPTED_STRATEGY_LINE = `- Accepted strategy: \`${LEGACY_STRATEGY_RELATIVE_DIR}/_guides/orchestration-shape-strategy.md\``;
export const LEGACY_STRATEGY_MAP_LINE = `- Strategy map: \`${LEGACY_STRATEGY_RELATIVE_DIR}/map.md\``;
export const LEGACY_STRATEGY_GUIDE_LINE = `- Strategy guide: \`${LEGACY_STRATEGY_RELATIVE_DIR}/guide/\``;
export const LEGACY_UNDERSCORE_STRATEGY_GUIDE_LINE = `- Strategy guide: \`${LEGACY_STRATEGY_RELATIVE_DIR}/_guides/\``;
export const LEGACY_STRATEGY_TEMPLATES_LINE = `- Strategy templates: \`${LEGACY_STRATEGY_RELATIVE_DIR}/templates/\``;
export const LEGACY_UNDERSCORE_STRATEGY_TEMPLATES_LINE = `- Strategy templates: \`${LEGACY_STRATEGY_RELATIVE_DIR}/_templates/\``;
export const LEGACY_PRESSURE_LEDGER_LINE = `- Pressure ledger: \`${LEGACY_STRATEGY_RELATIVE_DIR}/pressure-ledger.md\``;

export const STARTER_DIRECTORIES = [
  "agents",
  "artifacts",
  "checkpoints",
  "edges",
  "runs",
  "shapes",
  "workpieces",
];

export const MAP_TEMPLATE = `# Shape Strategy Map

Status: initialized

## Intent

Describe the current project orchestration shape. Keep this map project-local
and update it only when workpieces, shapes, checkpoints, or flow are accepted.

## Start

- Start: none
- Starts: none

## Shape References

- none

## Checkpoint References

- none

## Active Run References

- none

## Agent References

- none

## Trunk / Flow

- none

## Intentional Disconnected Components

- Intentional: no
- Notes: none

## Evidence

- none
`;

export const PRESSURE_LEDGER_TEMPLATE = `# Pressure Ledger

Status: active feedback ledger

This ledger records friction against the orchestration shape strategy itself.
Entries are not accepted architecture by default.

Promotion path:

\`\`\`text
pressure entry -> discussion -> accepted decision -> strategy doc update
\`\`\`

## Entry: <short name>

Date: <YYYY-MM-DD or unknown>
Status: open | absorbed | rejected | deferred

Pressure:
upper | lower | sideways | <combined directions>

Signal:
<what happened>

Why It Matters:
<what this reveals about the strategy, docs, graph, or orchestration behavior>

Affected Artifacts:
- <doc, shape, workpiece, run, checkpoint, thread, repo, commit, or none>

Recommended Response:
<change, test, avoid, defer, or discuss>

Decision:
`;

export function starterDirectoryReadme(directory) {
  const label = directory[0].toUpperCase() + directory.slice(1);

  return `# ${label}

Status: initialized

Add project-local ${directory} Markdown docs here when they are accepted.
`;
}

export function strategyExperimentsReadme() {
  return `# Strategy Experiments

Status: optional

Use this folder only for alternate or experimental orchestration strategies.
The active project orchestration docs live at the selected orchestration root.
`;
}

export function shapeStrategyArchitectureBlock() {
  return `## Shape Strategy

${STRATEGY_MAP_LINE}
${ACCEPTED_STRATEGY_LINE}
${STRATEGY_GUIDE_LINE}
${STRATEGY_TEMPLATES_LINE}
${PRESSURE_LEDGER_LINE}
${SHAPE_RUN_RETURN_LINE}
`;
}
