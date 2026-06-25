#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { access, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const LEGACY_ORCHESTRATION_DIR = ".codex-orchestration";
const DOCKED_ORCHESTRATION_RELATIVE_DIR = "docs/orchestration";
const SOURCE_STRATEGY_RELATIVE_DIR = "strategies/shape-strategy";
const MAP_FILENAME = "map.md";
const DOC_DIRS = ["agents", "runs", "shapes", "workpieces", "checkpoints", "artifacts"];
const CANDIDATE_STATUSES = new Set([
  "active",
  "in_progress",
  "paused",
  "returned",
  "returned-for-review",
  "blocked",
  "returned_at_human_gate",
  "returned-at-human-gate",
]);
const HELP = `Usage: npm run orchestration-state -- [--thread <thread-id>]

Prints read-only orchestration context for the current working directory.

The command discovers the nearest orchestration root, reads local Git/worktree
facts, scans agents/*.md and runs/*.md, and prints the most relevant docs to
read next. It never creates worktrees, edits docs, or changes statuses.

Identity hints:
  --thread <id>              explicit thread search hint
  ORCHESTRATION_THREAD_ID    preferred environment hint
  CODEX_THREAD_ID            opportunistic Codex/runtime hint`;

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(HELP);
  process.exit(0);
}

try {
  const cwd = process.env.INIT_CWD
    ? path.resolve(process.env.INIT_CWD)
    : process.cwd();
  const threadHint = readThreadHint(args);
  const resolution = await findNearestOrchestrationRoot(cwd);
  const gitFacts = readGitFacts(cwd);

  if (!resolution) {
    printMissingRoot(cwd, gitFacts, threadHint);
    process.exit(1);
  }

  const docs = await readOrchestrationDocs(resolution.rootDir);
  const context = buildContext({
    resolution,
    docs,
    gitFacts,
    threadHint,
  });

  printContext(context);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}

function readThreadHint(args) {
  const explicitIndex = args.indexOf("--thread");

  if (explicitIndex >= 0) {
    const value = args[explicitIndex + 1]?.trim();

    if (value) {
      return {
        value,
        source: "--thread",
      };
    }
  }

  if (process.env.ORCHESTRATION_THREAD_ID?.trim()) {
    return {
      value: process.env.ORCHESTRATION_THREAD_ID.trim(),
      source: "ORCHESTRATION_THREAD_ID",
    };
  }

  if (process.env.CODEX_THREAD_ID?.trim()) {
    return {
      value: process.env.CODEX_THREAD_ID.trim(),
      source: "CODEX_THREAD_ID",
    };
  }

  return null;
}

async function findNearestOrchestrationRoot(cwd) {
  let current = path.resolve(cwd);

  while (true) {
    const resolution = await resolveOrchestrationRoot(current);

    if (resolution) {
      return resolution;
    }

    const parent = path.dirname(current);

    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

async function resolveOrchestrationRoot(workspaceInput) {
  const workspace = workspaceInput.trim();

  if (!workspace) {
    return null;
  }

  const resolvedWorkspace = path.resolve(workspace);
  const candidates = [
    {
      rootDir: resolvedWorkspace,
      relativePathFromWorkspace: "",
      kind: "selected-root",
    },
    {
      rootDir: path.join(resolvedWorkspace, DOCKED_ORCHESTRATION_RELATIVE_DIR),
      relativePathFromWorkspace: DOCKED_ORCHESTRATION_RELATIVE_DIR,
      kind: "docked",
    },
    {
      rootDir: path.join(resolvedWorkspace, LEGACY_ORCHESTRATION_DIR),
      relativePathFromWorkspace: LEGACY_ORCHESTRATION_DIR,
      kind: "legacy",
    },
    {
      rootDir: path.join(
        resolvedWorkspace,
        LEGACY_ORCHESTRATION_DIR,
        SOURCE_STRATEGY_RELATIVE_DIR
      ),
      relativePathFromWorkspace: `${LEGACY_ORCHESTRATION_DIR}/${SOURCE_STRATEGY_RELATIVE_DIR}`,
      kind: "source-strategy",
    },
  ];

  for (const candidate of candidates) {
    if (await isOrchestrationRoot(candidate.rootDir)) {
      return {
        workspace,
        resolvedWorkspace,
        ...candidate,
      };
    }
  }

  return null;
}

async function isOrchestrationRoot(rootDir) {
  try {
    const [directory, mapFile] = await Promise.all([
      stat(rootDir),
      stat(path.join(rootDir, MAP_FILENAME)),
    ]);

    return directory.isDirectory() && mapFile.isFile();
  } catch {
    return false;
  }
}

function readGitFacts(cwd) {
  const repoRoot = git(cwd, ["rev-parse", "--show-toplevel"], {
    allowFailure: true,
  });

  if (!repoRoot) {
    return {
      repoRoot: null,
      branch: null,
      head: null,
      upstream: null,
      worktreePath: null,
      linkedWorktree: false,
    };
  }

  const branch =
    git(repoRoot, ["branch", "--show-current"], { allowFailure: true }) ||
    "detached";
  const head = git(repoRoot, ["rev-parse", "--short=12", "HEAD"], {
    allowFailure: true,
  });
  const upstream = git(repoRoot, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], {
    allowFailure: true,
  });
  const worktrees = parseWorktrees(
    git(repoRoot, ["worktree", "list", "--porcelain"], { allowFailure: true })
  );
  const matchingWorktree = worktrees.find(
    (worktree) => path.resolve(worktree.path) === path.resolve(repoRoot)
  );
  const linkedWorktree =
    !!matchingWorktree && worktrees.length > 0 && worktrees[0]?.path !== matchingWorktree.path;

  return {
    repoRoot,
    branch,
    head: head || null,
    upstream: upstream || null,
    worktreePath: matchingWorktree?.path ?? repoRoot,
    linkedWorktree,
  };
}

function parseWorktrees(output) {
  if (!output) {
    return [];
  }

  const worktrees = [];
  let current = null;

  for (const line of output.split(/\r?\n/)) {
    if (line.startsWith("worktree ")) {
      if (current) {
        worktrees.push(current);
      }
      current = { path: line.slice("worktree ".length), branch: null, head: null };
      continue;
    }

    if (!current) {
      continue;
    }

    if (line.startsWith("HEAD ")) {
      current.head = line.slice("HEAD ".length);
    } else if (line.startsWith("branch ")) {
      current.branch = line.slice("branch ".length).replace(/^refs\/heads\//, "");
    }
  }

  if (current) {
    worktrees.push(current);
  }

  return worktrees;
}

async function readOrchestrationDocs(rootDir) {
  const docs = [];

  for (const dir of DOC_DIRS) {
    const dirPath = path.join(rootDir, dir);

    if (!(await exists(dirPath))) {
      continue;
    }

    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) {
        continue;
      }

      const relativePath = `${dir}/${entry.name}`;
      const content = await readFile(path.join(rootDir, relativePath), "utf8");
      docs.push(parseMarkdownDoc(relativePath, content));
    }
  }

  if (await exists(path.join(rootDir, "map.md"))) {
    docs.push(parseMarkdownDoc("map.md", await readFile(path.join(rootDir, "map.md"), "utf8")));
  }

  return docs.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function parseMarkdownDoc(relativePath, content) {
  const title =
    content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? referenceToId(relativePath);
  const status = content.match(/^Status:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const role = content.match(/^Role:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const sections = new Map();
  const matches = [...content.matchAll(/^##\s+(.+)$/gm)];

  for (const [index, match] of matches.entries()) {
    const heading = normalizeHeading(match[1] ?? "");
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? content.length;
    sections.set(heading, content.slice(start, end).trim());
  }

  return {
    relativePath,
    kind: relativePath.split("/")[0],
    id: referenceToId(relativePath),
    title: simplifyTitle(title),
    status,
    role,
    content,
    sections,
    allRefs: readReferencePaths(content),
    threadIds: readThreadIds(content),
    worktreePaths: readPathLikeValues(content, ["worktree", "main checkout", "workspace"]),
    branches: readNamedValues(content, ["branch", "branch at launch"]),
    heads: readNamedValues(content, ["head"]),
    currentNode: readCurrentNode(sections.get("current position")) ?? readCurrentNode(sections.get("state summary")),
    preview: readPreview(content),
  };
}

function buildContext({ resolution, docs, gitFacts, threadHint }) {
  const mapDoc = docs.find((doc) => doc.relativePath === "map.md") ?? null;
  const agents = docs.filter((doc) => doc.kind === "agents" && doc.id !== "readme");
  const runs = docs.filter((doc) => doc.kind === "runs" && doc.id !== "readme");
  const indexedDocs = new Map(docs.map((doc) => [doc.relativePath, doc]));
  const scored = [
    ...agents.map((doc) => scoreDoc(doc, "agent", { gitFacts, threadHint })),
    ...runs.map((doc) => scoreDoc(doc, "run", { gitFacts, threadHint })),
  ].sort((a, b) => b.score - a.score || a.doc.relativePath.localeCompare(b.doc.relativePath));

  const best = scored[0] ?? null;
  const confidence = confidenceForScore(best?.score ?? 0);
  const matchedAgent =
    confidence === "high" || confidence === "medium"
      ? best?.kind === "agent"
        ? best.doc
        : findLinkedAgent(best?.doc, agents)
      : null;
  const matchedRun =
    confidence === "high" || confidence === "medium"
      ? best?.kind === "run"
        ? best.doc
        : findLinkedRun(best?.doc, runs)
      : null;
  const candidateAgents = selectCandidates(agents, scored, "agent");
  const candidateRuns = selectCandidates(runs, scored, "run");
  const readNext = createReadNext({
    matchedAgent,
    matchedRun,
    candidateAgents,
    candidateRuns,
    indexedDocs,
  });
  const warnings = createWarnings({
    confidence,
    gitFacts,
    threadHint,
    matchedAgent,
    matchedRun,
    agents,
    runs,
  });

  return {
    resolution,
    gitFacts,
    threadHint,
    mapDoc,
    confidence,
    matchedBy: best?.reasons ?? [],
    matchedAgent,
    matchedRun,
    candidateAgents,
    candidateRuns,
    readNext,
    warnings,
  };
}

function scoreDoc(doc, kind, { gitFacts, threadHint }) {
  const reasons = [];
  let score = 0;

  if (threadHint?.value && doc.content.includes(threadHint.value)) {
    score += 100;
    reasons.push(`thread id (${threadHint.source})`);
  }

  if (gitFacts.worktreePath && doc.content.includes(gitFacts.worktreePath)) {
    score += 85;
    reasons.push("worktree path");
  }

  if (gitFacts.repoRoot && doc.content.includes(gitFacts.repoRoot)) {
    score += 45;
    reasons.push("repo root");
  }

  if (gitFacts.branch && gitFacts.branch !== "detached" && doc.content.includes(gitFacts.branch)) {
    score += 35;
    reasons.push("branch");
  }

  if (gitFacts.head && doc.content.includes(gitFacts.head)) {
    score += 35;
    reasons.push("HEAD");
  }

  return {
    kind,
    doc,
    score,
    reasons,
  };
}

function confidenceForScore(score) {
  if (score >= 80) {
    return "high";
  }
  if (score >= 35) {
    return "medium";
  }
  if (score > 0) {
    return "low";
  }
  return "none";
}

function findLinkedAgent(run, agents) {
  if (!run) {
    return null;
  }

  const explicitRefs = readReferencePaths(run.sections.get("agent reference") ?? "");
  const evidenceRefs = run.allRefs.filter((ref) => normalizeRef(ref).startsWith("agents/"));
  const agentRefs = [...explicitRefs, ...evidenceRefs].filter((ref) =>
    normalizeRef(ref).startsWith("agents/")
  );

  return findFirstReferencedDoc(agentRefs, agents);
}

function findLinkedRun(agent, runs) {
  if (!agent) {
    return null;
  }

  const explicitRefs = readReferencePaths(agent.sections.get("active run references") ?? "");
  const evidenceRefs = agent.allRefs.filter((ref) => normalizeRef(ref).startsWith("runs/"));
  const runRefs = [...explicitRefs, ...evidenceRefs].filter((ref) =>
    normalizeRef(ref).startsWith("runs/")
  );

  return findFirstReferencedDoc(runRefs, runs);
}

function findFirstReferencedDoc(refs, docs) {
  for (const ref of refs) {
    const match = docs.find((doc) => referenceToId(ref) === doc.id);

    if (match) {
      return match;
    }
  }

  return null;
}

function selectCandidates(docs, scored, kind) {
  const sortedByScore = scored
    .filter((item) => item.kind === kind && item.score > 0)
    .map((item) => item.doc);

  const active = docs.filter((doc) => isCandidateStatus(doc.status));
  return uniqueDocs([...sortedByScore, ...active]).slice(0, 5);
}

function createReadNext({ matchedAgent, matchedRun, candidateAgents, candidateRuns, indexedDocs }) {
  const paths = [];
  const primaryAgent = matchedAgent ?? candidateAgents[0] ?? null;
  const primaryRun = matchedRun ?? candidateRuns[0] ?? null;

  addPath(paths, primaryAgent?.relativePath);
  addPath(paths, primaryRun?.relativePath);

  for (const currentNode of [primaryAgent?.currentNode, primaryRun?.currentNode].filter(Boolean)) {
    addPath(paths, findDocPathById(indexedDocs, currentNode));
  }

  for (const doc of [primaryAgent, primaryRun].filter(Boolean)) {
    for (const ref of doc.allRefs) {
      const normalized = normalizeRef(ref);

      if (
        normalized.startsWith("shapes/") ||
        normalized.startsWith("workpieces/") ||
        normalized.startsWith("checkpoints/") ||
        normalized.startsWith("artifacts/")
      ) {
        addPath(paths, normalized);
      }
    }
  }

  return paths
    .filter((relativePath) => relativePath && indexedDocs.has(relativePath))
    .slice(0, 10);
}

function createWarnings({ confidence, gitFacts, threadHint, matchedAgent, matchedRun, agents, runs }) {
  const warnings = [];

  if (confidence === "low" || confidence === "none") {
    warnings.push("No strong agent/run identity match. Review candidates before acting.");
  }

  if (gitFacts.linkedWorktree && !matchedAgent && !matchedRun) {
    warnings.push("This appears to be a linked Git worktree, but no active run or agent doc matched it.");
  }

  if (threadHint && ![matchedAgent, matchedRun].some((doc) => doc?.content.includes(threadHint.value))) {
    const suffix =
      confidence === "high"
        ? " Keeping the stronger non-thread identity match."
        : "";
    warnings.push(`Thread hint from ${threadHint.source} did not match a selected agent or run.${suffix}`);
  }

  if (agents.length === 0 && runs.length === 0) {
    warnings.push("No agent or run docs were found in this orchestration root.");
  }

  return warnings;
}

function printMissingRoot(cwd, gitFacts, threadHint) {
  console.log("Orchestration state: missing");
  console.log("");
  console.log("Current working directory:");
  console.log(`  ${cwd}`);
  console.log("");
  printGitFacts(gitFacts);
  console.log("");
  printThreadHint(threadHint);
  console.log("");
  console.log("Warnings:");
  console.log("  - No orchestration root found. Expected docs/orchestration, .codex-orchestration, or a selected orchestration root with map.md.");
}

function printContext(context) {
  console.log("Orchestration state:");
  console.log(`  root: ${context.resolution.rootDir}`);
  console.log(`  kind: ${context.resolution.kind}`);
  console.log(`  workspace: ${context.resolution.resolvedWorkspace}`);

  if (context.mapDoc) {
    console.log(`  map: ${context.mapDoc.relativePath}`);
    console.log(`  status: ${context.mapDoc.status ?? "unknown"}`);
  }

  console.log("");
  printGitFacts(context.gitFacts);
  console.log("");
  printThreadHint(context.threadHint);
  console.log("");

  console.log("Identity:");
  console.log(`  confidence: ${context.confidence}`);
  console.log(`  matched by: ${context.matchedBy.length ? context.matchedBy.join(", ") : "none"}`);
  console.log("");

  if (context.matchedAgent) {
    printDocSummary("Matched agent", context.matchedAgent);
  } else {
    printCandidateList("Candidate agents", context.candidateAgents);
  }

  console.log("");

  if (context.matchedRun) {
    printDocSummary("Matched run", context.matchedRun);
  } else {
    printCandidateList("Candidate runs", context.candidateRuns);
  }

  console.log("");
  console.log("Read next:");
  if (context.readNext.length > 0) {
    context.readNext.forEach((relativePath, index) => {
      console.log(`  ${index + 1}. ${relativePath}`);
    });
  } else {
    console.log("  none");
  }

  console.log("");
  console.log("Warnings:");
  if (context.warnings.length > 0) {
    for (const warning of context.warnings) {
      console.log(`  - ${warning}`);
    }
  } else {
    console.log("  none");
  }

  console.log("");
  console.log("Next step:");
  console.log("  Read the matched agent/run and current node docs before acting.");
  console.log("  Do not move position or status unless the docs justify that update.");
  console.log("");
  console.log("Reminder:");
  console.log("  If this work moved to another node/workpiece, update the agent Current Position");
  console.log("  and run State Summary before return.");
}

function printGitFacts(gitFacts) {
  console.log("Git:");
  console.log(`  repo root: ${gitFacts.repoRoot ?? "not available"}`);
  console.log(`  worktree: ${gitFacts.worktreePath ?? "not available"}`);
  console.log(`  linked worktree: ${gitFacts.linkedWorktree ? "yes" : "no"}`);
  console.log(`  branch: ${gitFacts.branch ?? "not available"}`);
  console.log(`  upstream: ${gitFacts.upstream ?? "not available"}`);
  console.log(`  HEAD: ${gitFacts.head ?? "not available"}`);
}

function printThreadHint(threadHint) {
  console.log("Thread:");
  if (threadHint) {
    console.log(`  id: ${threadHint.value}`);
    console.log(`  source: ${threadHint.source}`);
  } else {
    console.log("  id: not available");
    console.log("  source: not available");
  }
}

function printDocSummary(label, doc) {
  console.log(`${label}:`);
  console.log(`  ${doc.relativePath}`);
  console.log(`  title: ${doc.title}`);
  console.log(`  status: ${doc.status ?? "unknown"}`);
  if (doc.role) {
    console.log(`  role: ${doc.role}`);
  }
  if (doc.currentNode) {
    console.log(`  current node: ${doc.currentNode}`);
  }
  if (doc.preview) {
    console.log(`  preview: ${doc.preview}`);
  }
}

function printCandidateList(label, docs) {
  console.log(`${label}:`);
  if (docs.length === 0) {
    console.log("  none");
    return;
  }

  for (const doc of docs) {
    const extras = [
      doc.status ? `status: ${doc.status}` : null,
      doc.currentNode ? `node: ${doc.currentNode}` : null,
    ].filter(Boolean);
    console.log(`  - ${doc.relativePath}${extras.length ? ` (${extras.join(", ")})` : ""}`);
  }
}

function readCurrentNode(section) {
  if (!section) {
    return null;
  }

  const patterns = [
    /(?:^|\n)\s*(?:[-*+]\s+)?Node:\s*`?([^`\n]+?)`?\s*(?:\n|$)/i,
    /(?:^|\n)\s*(?:[-*+]\s+)?Current node:\s*`?([^`\n]+?)`?\s*(?:\n|$)/i,
  ];

  for (const pattern of patterns) {
    const match = section.match(pattern);
    if (match?.[1]) {
      return stripTrailingSentence(match[1].trim());
    }
  }

  return null;
}

function readPreview(content) {
  const match = content.match(/(?:^|\n)\s*(?:[-*+]\s+)?Preview:\s*(`?)([^`\n]+)\1/im);
  return match?.[2]?.trim() ?? null;
}

function readThreadIds(content) {
  return [...content.matchAll(/019e[a-f0-9-]+/gi)].map((match) => match[0]);
}

function readPathLikeValues(content, names) {
  return readNamedValues(content, names).filter((value) => value.startsWith("/"));
}

function readNamedValues(content, names) {
  const values = [];

  for (const name of names) {
    const pattern = new RegExp(
      "(?:^|\\n)\\s*(?:[-*+]\\s+)?" +
        escapeRegExp(name) +
        "\\s*:\\s*(`?)([^`\\n]+)\\1",
      "gi"
    );

    for (const match of content.matchAll(pattern)) {
      const value = match[2]?.trim();
      if (value) {
        values.push(stripTrailingSentence(value));
      }
    }
  }

  return values;
}

function readReferencePaths(content) {
  return [...content.matchAll(/`([^`]+)`/g)]
    .map((match) => normalizeRef(match[1] ?? ""))
    .filter((reference) => /^[a-z][a-z-]+\//.test(reference) && reference.endsWith(".md"));
}

function normalizeRef(reference) {
  return reference.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\.codex-orchestration\//, "");
}

function referenceToId(reference) {
  const normalized = normalizeRef(reference);
  return path.basename(normalized).replace(/\.md$/, "");
}

function normalizeHeading(heading) {
  return heading.trim().toLowerCase();
}

function simplifyTitle(title) {
  return title.replace(/^(Agent|Run|Shape|Workpiece|Checkpoint|Artifact|Orchestration Map):\s*/i, "").trim();
}

function isCandidateStatus(status) {
  const normalized = normalizeStatus(status);
  return normalized ? CANDIDATE_STATUSES.has(normalized) : false;
}

function findDocPathById(indexedDocs, id) {
  if (!id) {
    return null;
  }

  const normalizedId = referenceToId(id);
  const preferredKinds = ["workpieces", "checkpoints", "shapes", "artifacts"];

  for (const kind of preferredKinds) {
    const relativePath = [...indexedDocs.keys()].find(
      (candidate) =>
        candidate.startsWith(`${kind}/`) && referenceToId(candidate) === normalizedId
    );

    if (relativePath) {
      return relativePath;
    }
  }

  return null;
}

function normalizeStatus(status) {
  return status?.trim().toLowerCase().replace(/_/g, "-") ?? null;
}

function stripTrailingSentence(value) {
  return value.replace(/\.$/, "").trim();
}

function addPath(paths, relativePath) {
  if (relativePath && !paths.includes(relativePath)) {
    paths.push(relativePath);
  }
}

function uniqueDocs(docs) {
  const seen = new Set();
  const result = [];

  for (const doc of docs) {
    if (!seen.has(doc.relativePath)) {
      seen.add(doc.relativePath);
      result.push(doc);
    }
  }

  return result;
}

function git(cwd, args, { allowFailure = false } = {}) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch (error) {
    if (allowFailure) {
      return "";
    }
    throw error;
  }
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
