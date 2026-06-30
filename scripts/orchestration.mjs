#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { access, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const LEGACY_ORCHESTRATION_DIR = ".codex-orchestration";
const DOCKED_ORCHESTRATION_RELATIVE_DIR = "docs/orchestration";
const SOURCE_STRATEGY_RELATIVE_DIR = "strategies/shape-strategy";
const MAP_FILENAME = "map.md";
const DOC_DIRS = ["agents", "runs", "shapes", "workpieces", "checkpoints", "artifacts"];
const WORK_TYPES = new Set(["implementation", "discussion", "review", "docs-only", "steward-local"]);
const EXECUTION_MODES = new Set(["visible-thread", "subagent", "steward-local", "reviewer"]);
const UPDATE_STATUSES = new Set(["active", "paused", "blocked"]);
const PREVIEW_DISPOSITIONS = new Set(["sidecar-used", "left-running", "stopped", "unavailable"]);
const LIVE_AGENT_STATUSES = new Set(["active", "in-progress", "in_progress", "paused", "blocked"]);
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
const HELP = `Usage: npm run orchestration -- <verb> [options]

Verbs:
  state      Print read-only orchestration context for the current directory.
  check      Run read-only consistency checks. Use --full for adapter validation.
  prepare    Plan/apply starter run and agent docs for an existing boundary.
  update     Plan/apply mechanical current run/agent state updates.
  return     Plan/apply returned or accepted run closeout.

Common identity hints:
  --thread <id>              explicit thread search hint
  ORCHESTRATION_THREAD_ID    preferred environment hint
  CODEX_THREAD_ID            opportunistic Codex/runtime hint

Examples:
  npm run orchestration -- state
  npm run orchestration -- check --full
  npm run orchestration -- prepare --work-type implementation --target workpieces/foo.md
  npm run orchestration -- update --status paused --apply
  npm run orchestration -- return --auto-accept --apply`;

const args = process.argv.slice(2);
const verb = readVerb(args);
const verbArgs = args.slice(verb.consumed);

if (verbArgs.includes("--help") || verbArgs.includes("-h")) {
  console.log(HELP);
  process.exit(0);
}

try {
  const cwd = process.env.INIT_CWD
    ? path.resolve(process.env.INIT_CWD)
    : process.cwd();
  const threadHint = readThreadHint(verbArgs);
  const rootOverride = process.env.ORCHESTRATION_ROOT?.trim();
  const resolution = rootOverride
    ? await resolveOrchestrationRoot(rootOverride)
    : await findNearestOrchestrationRoot(cwd);
  const gitFacts = readGitFacts(cwd);

  if (!resolution) {
    if (rootOverride) {
      throw new Error(`ORCHESTRATION_ROOT does not point at a valid orchestration root: ${rootOverride}`);
    }
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

  switch (verb.name) {
    case "state":
      printContext(context);
      break;
    case "check":
      await runCheck(context, verbArgs);
      break;
    case "prepare":
      await runPrepare(context, verbArgs);
      break;
    case "update":
      await runUpdate(context, verbArgs);
      break;
    case "return":
      await runReturn(context, verbArgs);
      break;
    default:
      throw new Error(`Unknown orchestration verb: ${verb.name}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}

function readVerb(args) {
  const candidate = args[0];
  const verbs = new Set(["state", "check", "prepare", "update", "return"]);

  if (!candidate || candidate.startsWith("-")) {
    return { name: "state", consumed: 0 };
  }

  if (!verbs.has(candidate)) {
    throw new Error(`Unknown orchestration verb "${candidate}". Run with --help for usage.`);
  }

  return { name: candidate, consumed: 1 };
}

async function runCheck(context, args) {
  const full = args.includes("--full");
  const warnings = [...context.warnings];
  const hardStops = [];
  const mapDoc = context.mapDoc;
  const docsByPath = new Map(context.docs.map((doc) => [doc.relativePath, doc]));

  if (!context.resolution?.rootDir) {
    hardStops.push("Missing selected orchestration root.");
  }

  if (mapDoc) {
    const activeRunRefs = readReferencePaths(mapDoc.sections.get("active run references") ?? "");
    const agentRefs = readReferencePaths(mapDoc.sections.get("agent references") ?? "");

    for (const ref of activeRunRefs) {
      if (!docsByPath.has(normalizeRef(ref))) {
        hardStops.push(`Active run reference is missing a doc: ${normalizeRef(ref)}`);
      }
    }

    for (const ref of agentRefs) {
      if (!docsByPath.has(normalizeRef(ref))) {
        hardStops.push(`Agent reference is missing a doc: ${normalizeRef(ref)}`);
      }
    }

    for (const ref of activeRunRefs) {
      const doc = docsByPath.get(normalizeRef(ref));
      const status = normalizeStatus(doc?.status);
      if (status === "accepted" || status === "returned") {
        warnings.push(`Active run reference has non-active status: ${normalizeRef(ref)} (${doc.status})`);
      }
    }

    for (const ref of agentRefs) {
      const doc = docsByPath.get(normalizeRef(ref));
      const status = normalizeStatus(doc?.status);
      if (status === "accepted" || status === "returned") {
        warnings.push(`Agent reference has historical marker status: ${normalizeRef(ref)} (${doc.status})`);
      } else if (status && !LIVE_AGENT_STATUSES.has(status)) {
        warnings.push(`Agent reference has non-live marker status: ${normalizeRef(ref)} (${doc.status})`);
      }
    }
  }

  if (context.gitFacts.linkedWorktree && !context.matchedAgent && !context.matchedRun) {
    hardStops.push("Current implementation worktree has no matching active run or agent.");
  }

  console.log("Orchestration check:");
  console.log(`  root: ${context.resolution.rootDir}`);
  console.log(`  kind: ${context.resolution.kind}`);
  console.log(`  identity confidence: ${context.confidence}`);
  console.log(`  matched agent: ${context.matchedAgent?.relativePath ?? "none"}`);
  console.log(`  matched run: ${context.matchedRun?.relativePath ?? "none"}`);
  console.log("");

  printGitFacts(context.gitFacts);
  console.log("");

  console.log("Warnings:");
  if (warnings.length > 0) {
    for (const warning of uniqueStrings(warnings)) {
      console.log(`  - ${warning}`);
    }
  } else {
    console.log("  none");
  }
  console.log("");

  console.log("Hard stops:");
  if (hardStops.length > 0) {
    for (const hardStop of uniqueStrings(hardStops)) {
      console.log(`  - ${hardStop}`);
    }
  } else {
    console.log("  none");
  }

  if (full) {
    console.log("");
    console.log("Full validation:");
    runAdapterValidation(context.resolution.resolvedWorkspace);
  } else {
    console.log("");
    console.log("Full validation:");
    console.log("  skipped");
    console.log(`  run: npm run check:shape-strategy-adapter -- ${context.resolution.resolvedWorkspace}`);
    console.log("  or: npm run orchestration -- check --full");
  }

  if (hardStops.length > 0) {
    process.exitCode = 1;
  }
}

async function runPrepare(context, args) {
  const options = parseOptions(args);
  const apply = Boolean(options.apply);
  const workType = String(options["work-type"] ?? "").trim();
  const targetInput = String(options.target ?? "").trim();

  if (!WORK_TYPES.has(workType)) {
    throw new Error("prepare requires --work-type implementation|discussion|review|docs-only|steward-local");
  }

  if (!targetInput) {
    printBoundaryCandidates(context);
    throw new Error("prepare requires --target <existing shape|workpiece|checkpoint path-or-id>");
  }

  const targetDoc = findExistingBoundaryDoc(context, targetInput);
  if (!targetDoc) {
    printBoundaryCandidates(context);
    throw new Error(`Selected boundary does not exist: ${targetInput}`);
  }

  const suffix = uniqueSuffix();
  const baseSlug = targetDoc.kind === "workpieces" ? targetDoc.id : referenceToId(targetDoc.relativePath);
  const runId = `${baseSlug}-${suffix}`;
  const agentSuffix = workType === "review" ? "reviewer" : "agent";
  const stewardAgent = context.matchedAgent ?? context.docs.find((doc) => doc.kind === "agents" && doc.id.includes("steward"));
  const agentId = workType === "steward-local" ? stewardAgent?.id ?? "steward" : `${runId}-${agentSuffix}`;
  const runPath = `runs/${runId}.md`;
  const agentPath = workType === "steward-local" && stewardAgent
    ? stewardAgent.relativePath
    : `agents/${agentId}.md`;
  const parentAgentPath = stewardAgent?.relativePath ?? "agents/steward.md";
  const branchName = `codex/${runId}`;
  const repoName = path.basename(context.gitFacts.repoRoot ?? context.resolution.resolvedWorkspace);
  const worktreePath = path.join(process.env.HOME ?? "/Users/olafbobryk", ".codex", "worktrees", suffix, repoName);
  const executionMode = normalizeExecutionMode(options.mode, workType);
  const createsWorktree = workType === "implementation";
  const launchBranchName = createsWorktree ? branchName : context.gitFacts.branch ?? "none";
  const launchWorktreePath = createsWorktree ? worktreePath : "none";
  const productRoot = productRootForContext(context);
  const launchDraftPath = path.join(productRoot, ".codex", "tmp", `orchestration-launch-${runId}.md`);
  const threadId = typeof options.thread === "string" ? options.thread : "";
  const runTitle = titleFromId(runId);

  const plan = [
    `Would create run doc: ${runPath}`,
    workType === "steward-local" ? `Would use existing steward agent: ${agentId}` : `Would create agent doc: ${agentPath}`,
    `Would update map.md active run references with ${runPath}`,
    workType === "steward-local" ? "Would not add a new agent marker ref" : `Would update map.md agent references with ${agentPath}`,
    createsWorktree
      ? `Would create worktree first: ${worktreePath} on branch ${branchName}`
      : "Would not create a worktree for this work type",
    `Would write launch draft: ${path.relative(productRoot, launchDraftPath)}`,
  ];

  console.log("Orchestration prepare plan:");
  console.log(`  work type: ${workType}`);
  console.log(`  mode: ${executionMode}`);
  console.log(`  target: ${targetDoc.relativePath}`);
  console.log(`  run id: ${runId}`);
  console.log(`  agent id: ${agentId}`);
  console.log("");
  printPlan(plan);
  console.log("");
  console.log(createThreadLaunchDraft({
    runTitle,
    runId,
    agentId,
    workType,
    executionMode,
    targetDoc,
    runPath,
    agentPath,
    branchName: launchBranchName,
    worktreePath: launchWorktreePath,
    threadId,
  }));

  if (!apply) {
    console.log("");
    console.log("No files changed. Re-run with --apply to write starter docs.");
    return;
  }

  if (createsWorktree) {
    if (!context.gitFacts.repoRoot) {
      throw new Error("Cannot create implementation worktree without a Git repo root.");
    }
    await mkdir(path.dirname(worktreePath), { recursive: true });
    git(context.gitFacts.repoRoot, ["worktree", "add", "-b", branchName, worktreePath]);
  }

  const refreshedGitFacts = createsWorktree
    ? readGitFacts(worktreePath)
    : context.gitFacts;
  const runDoc = createRunDoc({
    title: runTitle,
    runId,
    status: "active",
    workType,
    executionMode,
    targetDoc,
    agentPath,
    branchName: createsWorktree ? branchName : refreshedGitFacts.branch,
    base: context.gitFacts.head,
    head: refreshedGitFacts.head,
    worktreePath: createsWorktree ? worktreePath : refreshedGitFacts.worktreePath,
    threadId,
  });
  const agentDoc = createAgentDoc({
    title: titleFromId(agentId),
    status: "active",
    workType,
    executionMode,
    targetDoc,
    runPath,
    branchName: createsWorktree ? branchName : refreshedGitFacts.branch,
    head: refreshedGitFacts.head,
    worktreePath: createsWorktree ? worktreePath : refreshedGitFacts.worktreePath,
    threadId,
    parentAgentPath,
  });

  await writeOrchestrationDoc(context.resolution.rootDir, runPath, runDoc, { allowOverwrite: false });
  if (workType !== "steward-local") {
    await writeOrchestrationDoc(context.resolution.rootDir, agentPath, agentDoc, { allowOverwrite: false });
  }
  await updateMapReferences(context.resolution.rootDir, {
    runPath,
    agentPath: workType === "steward-local" ? null : agentPath,
    runTitle,
    agentTitle: titleFromId(agentId),
  });
  await mkdir(path.dirname(launchDraftPath), { recursive: true });
  await writeFile(
    launchDraftPath,
    createThreadLaunchDraft({
      runTitle,
      runId,
      agentId,
      workType,
      executionMode,
      targetDoc,
      runPath,
      agentPath,
      branchName: launchBranchName,
      worktreePath: launchWorktreePath,
      threadId,
    }),
    "utf8"
  );

  console.log("");
  console.log("Applied prepare changes.");
}

async function runUpdate(context, args) {
  const options = parseOptions(args);
  const apply = Boolean(options.apply);
  const changes = [];
  const files = [];
  const status = options.status ? String(options.status) : null;
  const position = options.position ? String(options.position) : null;
  const preview = options.preview ? String(options.preview) : null;
  const note = options.note ? String(options.note) : null;
  const thread = options.thread ? String(options.thread) : null;
  const refreshGit = Boolean(options["refresh-git"]);

  if (status && !UPDATE_STATUSES.has(status)) {
    throw new Error("--status accepts only active, paused, or blocked");
  }
  if (preview && !PREVIEW_DISPOSITIONS.has(preview)) {
    throw new Error("--preview accepts only sidecar-used, left-running, stopped, or unavailable");
  }
  if (!context.matchedAgent && !context.matchedRun) {
    throw new Error("No matched agent or run. Run state/check and resolve identity before update.");
  }

  for (const doc of [context.matchedAgent, context.matchedRun].filter(Boolean)) {
    let content = doc.content;
    const original = content;

    if (status) {
      content = upsertTopLevelField(content, "Status", status);
      changes.push(`${doc.relativePath}: Status -> ${status}`);
    }
    if (position) {
      content = upsertSection(content, "Current Position", `- Node: \`${referenceToId(position)}\`\n- State: ${status ?? doc.status ?? "active"}`);
      changes.push(`${doc.relativePath}: Current Position -> ${position}`);
    }
    if (preview) {
      content = upsertPreviewSection(content, {
        disposition: preview,
        url: typeof options.url === "string" ? options.url : "none",
        pid: typeof options.pid === "string" ? options.pid : "none",
      });
      changes.push(`${doc.relativePath}: Preview -> ${preview}`);
    }
    if (refreshGit) {
      content = upsertNamedLine(content, "Branch", context.gitFacts.branch ?? "unknown");
      content = upsertNamedLine(content, "HEAD", context.gitFacts.head ?? "unknown");
      content = upsertNamedLine(content, "Worktree", context.gitFacts.worktreePath ?? "unknown");
      changes.push(`${doc.relativePath}: refreshed Git identity`);
    }
    if (thread) {
      content = upsertNamedLine(content, "Thread", thread);
      changes.push(`${doc.relativePath}: Thread -> ${thread}`);
    }
    if (note) {
      content = upsertSection(content, "State Summary", note);
      changes.push(`${doc.relativePath}: State Summary updated`);
    }

    if (content !== original) {
      files.push({ relativePath: doc.relativePath, content });
    }
  }

  console.log("Orchestration update plan:");
  printPlan(changes.length ? changes : ["No changes requested."]);
  if (!apply) {
    console.log("");
    console.log("No files changed. Re-run with --apply to write updates.");
    return;
  }

  for (const file of files) {
    await writeOrchestrationDoc(context.resolution.rootDir, file.relativePath, file.content, {
      allowOverwrite: true,
    });
  }
  console.log("");
  console.log(`Applied ${files.length} file update(s).`);
}

async function runReturn(context, args) {
  const options = parseOptions(args);
  const apply = Boolean(options.apply);
  const autoAccept = Boolean(options["auto-accept"]);
  const commit = Boolean(options.commit);
  const skipVerification = Boolean(options["skip-verification"]);
  const targetStatus = autoAccept ? "accepted" : "returned";
  const warnings = [];
  const hardStops = [];
  const changes = [];
  const files = [];

  if ((commit || autoAccept) && !apply) {
    throw new Error("--commit and --auto-accept require --apply");
  }
  if (!context.matchedRun) {
    throw new Error("No matched run. Run state/check and resolve identity before return.");
  }

  const gitStatus = readGitStatus(context.gitFacts.repoRoot);
  const commitScopePatterns = commit ? readCommitScopePatterns(context.matchedRun.content) : [];
  if (gitStatus.conflicts.length > 0) {
    hardStops.push("Unresolved conflict state.");
  }
  if (containsSecretPath(gitStatus.changedFiles)) {
    hardStops.push("Secret/env files are present in changed files.");
  }
  if (autoAccept && skipVerification) {
    hardStops.push("Skipped verification blocks --auto-accept when verification is required.");
  }
  if (autoAccept && context.confidence !== "high") {
    hardStops.push("Identity is not high confidence.");
  }
  if (autoAccept && !hasVerificationEvidence(context.matchedRun.content)) {
    hardStops.push("No verification evidence found in the matched run.");
  }
  const preExistingCommitFiles = gitStatus.changedFiles.filter((file) => !file.startsWith(".codex/tmp/"));
  if (commit && preExistingCommitFiles.length > 0 && commitScopePatterns.length === 0) {
    hardStops.push("No explicit commit/file scope found in the matched run.");
  }
  if (commit && commitScopePatterns.length > 0) {
    const outOfScope = preExistingCommitFiles.filter(
      (file) => !fileMatchesScope(file, commitScopePatterns)
    );
    if (outOfScope.length > 0) {
      hardStops.push(`Changed files outside documented commit scope: ${outOfScope.join(", ")}`);
    }
  }

  const runContent = applyReturnToDoc(context.matchedRun.content, {
    status: targetStatus,
    gitFacts: context.gitFacts,
    verification: skipVerification ? "skipped" : "not supplied",
    preview: context.matchedRun.preview ?? "unavailable",
  });
  files.push({ relativePath: context.matchedRun.relativePath, content: runContent });
  changes.push(`${context.matchedRun.relativePath}: Status -> ${targetStatus}`);

  if (context.matchedAgent) {
    const agentContent = applyReturnToDoc(context.matchedAgent.content, {
      status: targetStatus,
      gitFacts: context.gitFacts,
      verification: skipVerification ? "skipped" : "not supplied",
      preview: context.matchedAgent.preview ?? "unavailable",
    });
    files.push({ relativePath: context.matchedAgent.relativePath, content: agentContent });
    changes.push(`${context.matchedAgent.relativePath}: Status -> ${targetStatus}`);
  }

  const selectedWorkpiece = findSelectedWorkpiece(context);
  if (selectedWorkpiece) {
    files.push({
      relativePath: selectedWorkpiece.relativePath,
      content: upsertTopLevelField(selectedWorkpiece.content, "Status", targetStatus),
    });
    changes.push(`${selectedWorkpiece.relativePath}: Status -> ${targetStatus}`);
  }

  if (context.mapDoc) {
    const mapContent = moveRunReference(context.mapDoc.content, {
      runPath: context.matchedRun.relativePath,
      targetStatus,
      agentPath: context.matchedAgent?.relativePath ?? null,
    });
    files.push({ relativePath: context.mapDoc.relativePath, content: mapContent });
    changes.push("map.md: active refs updated");
  }

  console.log("Orchestration return plan:");
  console.log(`  target status: ${targetStatus}`);
  console.log(`  verification: ${skipVerification ? "skipped" : "default/not supplied"}`);
  console.log(`  commit: ${commit ? "requested" : "not requested"}`);
  console.log("");
  printPlan(changes);
  console.log("");
  console.log("Changed files detected:");
  printPlan(gitStatus.changedFiles.length ? gitStatus.changedFiles : ["none"]);
  console.log("");
  console.log("Warnings:");
  printPlan(warnings.length ? warnings : ["none"]);
  console.log("");
  console.log("Hard stops:");
  printPlan(hardStops.length ? hardStops : ["none"]);

  if (hardStops.length > 0) {
    process.exitCode = 1;
    return;
  }
  if (!apply) {
    console.log("");
    console.log("No files changed. Re-run with --apply to write return updates.");
    return;
  }

  for (const file of uniqueFiles(files)) {
    await writeOrchestrationDoc(context.resolution.rootDir, file.relativePath, file.content, {
      allowOverwrite: true,
    });
  }

  if (commit) {
    const cliTouchedFiles = uniqueFiles(files)
      .map((file) => repoRelativePath(context.gitFacts.repoRoot, context.resolution.rootDir, file.relativePath))
      .filter(Boolean);
    const commitFiles = uniqueStrings([
      ...gitStatus.changedFiles.filter((file) => !file.startsWith(".codex/tmp/")),
      ...cliTouchedFiles,
    ]);
    for (const file of commitFiles) {
      git(context.gitFacts.repoRoot, ["add", "--", file]);
    }
    const title = `${autoAccept ? "Accept" : "Complete"} ${context.matchedRun.title}`;
    const body = [
      `Run: ${context.matchedRun.relativePath}`,
      context.matchedAgent ? `Agent: ${context.matchedAgent.relativePath}` : null,
      `Verification: ${skipVerification ? "skipped" : "not supplied"}`,
      `Preview: ${context.matchedRun.preview ?? "unavailable"}`,
    ].filter(Boolean).join("\n");
    git(context.gitFacts.repoRoot, ["commit", "-m", title, "-m", body]);
  }

  console.log("");
  console.log(autoAccept ? "Applied accepted return." : "Applied returned state.");
}

function parseOptions(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg.startsWith("--")) {
      continue;
    }

    const key = arg.slice(2);
    const next = args[index + 1];

    if (!next || next.startsWith("--")) {
      options[key] = true;
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return options;
}

function normalizeExecutionMode(value, workType) {
  const fallback =
    workType === "steward-local"
      ? "steward-local"
      : workType === "review"
        ? "reviewer"
        : "visible-thread";
  const mode = String(value ?? fallback).trim();

  if (!EXECUTION_MODES.has(mode)) {
    throw new Error("--mode accepts visible-thread, subagent, steward-local, or reviewer");
  }

  return mode;
}

function findExistingBoundaryDoc(context, input) {
  const normalized = normalizeRef(input);
  const byPath = context.indexedDocs.get(normalized);

  if (byPath && ["shapes", "workpieces", "checkpoints"].includes(byPath.kind)) {
    return byPath;
  }

  const id = referenceToId(normalized);
  return context.docs.find(
    (doc) => ["shapes", "workpieces", "checkpoints"].includes(doc.kind) && doc.id === id
  ) ?? null;
}

function printBoundaryCandidates(context) {
  const candidates = context.docs
    .filter((doc) => ["shapes", "workpieces", "checkpoints"].includes(doc.kind))
    .filter((doc) => isCandidateStatus(doc.status))
    .slice(0, 12);

  console.log("Candidate boundaries:");
  if (candidates.length === 0) {
    console.log("  none");
    return;
  }

  for (const doc of candidates) {
    console.log(`  - ${doc.relativePath}${doc.status ? ` (${doc.status})` : ""}`);
  }
}

function uniqueSuffix() {
  return randomBytes(2).toString("hex");
}

function titleFromId(id) {
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function productRootForContext(context) {
  if (context.resolution.kind === "docked") {
    return context.resolution.resolvedWorkspace;
  }

  if (
    context.resolution.kind === "selected-root" &&
    context.resolution.rootDir.endsWith(DOCKED_ORCHESTRATION_RELATIVE_DIR)
  ) {
    return path.resolve(context.resolution.rootDir, "../..");
  }

  return context.gitFacts.repoRoot ?? context.resolution.resolvedWorkspace;
}

function createRunDoc({
  title,
  status,
  workType,
  executionMode,
  targetDoc,
  agentPath,
  branchName,
  base,
  head,
  worktreePath,
  threadId,
}) {
  return `# Run: ${title}

Status: ${status}
Work Type: ${workType}
Mode: ${executionMode}

## Intent

Run prepared for \`${targetDoc.relativePath}\`.

## ${capitalizeSingular(targetDoc.kind)} References

- \`${targetDoc.relativePath}\`

## Agent Reference

- \`${agentPath}\`

## Execution Context

- Thread: ${threadId || "pending"}.
- Worktree: ${worktreePath ?? "none"}.
- Branch: ${branchName ?? "none"}.
- Base: ${base ?? "unknown"}.
- HEAD: ${head ?? "unknown"}.

## Preview

- Owner: none
- URL: none
- Disposition: unavailable
- PID: none
- Notes: none

## State Summary

Prepared run for ${targetDoc.relativePath}.

## Gate / Return

- Human gate: no
- Returned checkpoint candidate: no
- Notes: follow selected boundary return expectations.

## Return Evidence

- Expected return: follow selected boundary docs.
`;
}

function createAgentDoc({
  title,
  status,
  workType,
  executionMode,
  targetDoc,
  runPath,
  branchName,
  head,
  worktreePath,
  threadId,
  parentAgentPath,
}) {
  return `# Agent: ${title}

Status: ${status}
Work Type: ${workType}
Mode: ${executionMode}

## Role

worker

## Parent Agent

- \`${parentAgentPath}\`

## Active ${capitalizeSingular(targetDoc.kind)} References

- \`${targetDoc.relativePath}\`

## Active Run References

- \`${runPath}\`

## Current Position

- Node: \`${targetDoc.id}\`
- State: active
- Marker: \`agent-${referenceToId(runPath)}\`

## Runtime Identity

- Thread: ${threadId || "pending"}.
- Worktree: ${worktreePath ?? "none"}.
- Branch: ${branchName ?? "none"}.
- HEAD: ${head ?? "unknown"}.
- Preview: none.

## Evidence

- Run: \`${runPath}\`
- Boundary: \`${targetDoc.relativePath}\`
`;
}

function createThreadLaunchDraft({
  runTitle,
  runId,
  agentId,
  workType,
  executionMode,
  targetDoc,
  runPath,
  agentPath,
  branchName,
  worktreePath,
  threadId,
}) {
  return `Thread launch draft:

Start a bounded orchestration run.

Run: ${runTitle}
Run id: ${runId}
Agent id: ${agentId}
Work Type: ${workType}
Mode: ${executionMode}
Thread: ${threadId || "pending"}

Read first:
- docs/ORCHESTRATION.md if present
- map.md
- ${targetDoc.relativePath}
- ${runPath}
- ${agentPath}

Execution context:
- Branch: ${branchName}
- Worktree: ${worktreePath}

Scope:
- Work inside the selected boundary: ${targetDoc.relativePath}
- Follow existing boundary docs.

Hard stops:
- Do not change shape boundaries, product direction, or acceptance criteria.
- Return to the steward for human gates or scope conflicts.

Return expectations:
- Run verification appropriate to the work type.
- Run orchestration return before closeout.
`;
}

function capitalizeSingular(kind) {
  const singular = kind.replace(/s$/, "");
  return singular[0].toUpperCase() + singular.slice(1);
}

async function writeOrchestrationDoc(rootDir, relativePath, content, { allowOverwrite }) {
  const target = path.join(rootDir, relativePath);

  if (!allowOverwrite && await exists(target)) {
    throw new Error(`Refusing to overwrite existing doc: ${relativePath}`);
  }

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${content.trimEnd()}\n`, "utf8");
}

async function updateMapReferences(rootDir, { runPath, agentPath, runTitle, agentTitle }) {
  const mapPath = path.join(rootDir, "map.md");
  let content = await readFile(mapPath, "utf8");

  content = addSectionBullet(
    content,
    "Active Run References",
    `- \`${runPath}\`: active run for ${runTitle}.`
  );

  if (agentPath) {
    content = addSectionBullet(
      content,
      "Agent References",
      `- \`${agentPath}\`: active worker marker for ${agentTitle}.`
    );
  }

  await writeFile(mapPath, content, "utf8");
}

function addSectionBullet(content, heading, bullet) {
  const section = readSectionRange(content, heading);

  if (!section) {
    return `${content.trimEnd()}\n\n## ${heading}\n\n${bullet}\n`;
  }

  if (section.body.includes(bullet)) {
    return content;
  }

  const body = section.body
    .replace(/^\s*-\s+none\s*$/im, "")
    .trim();
  const nextBody = `${body ? `${body}\n` : ""}${bullet}\n`;
  return `${content.slice(0, section.bodyStart)}${nextBody}${content.slice(section.bodyEnd)}`;
}

function readSectionRange(content, heading) {
  const headingPattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "im");
  const match = content.match(headingPattern);

  if (!match || match.index === undefined) {
    return null;
  }

  const headingEnd = match.index + match[0].length;
  const bodyStart = headingEnd + (content[headingEnd] === "\n" ? 1 : 0);
  const nextHeadingMatch = content.slice(bodyStart).match(/^##\s+/m);
  const bodyEnd = nextHeadingMatch?.index === undefined
    ? content.length
    : bodyStart + nextHeadingMatch.index;

  return {
    body: content.slice(bodyStart, bodyEnd).trim(),
    bodyStart,
    bodyEnd,
  };
}

function upsertTopLevelField(content, field, value) {
  const pattern = new RegExp(`^${escapeRegExp(field)}:\\s*.*$`, "m");

  if (pattern.test(content)) {
    return content.replace(pattern, `${field}: ${value}`);
  }

  const titleMatch = content.match(/^#\s+.+$/m);
  if (titleMatch && titleMatch.index !== undefined) {
    const insertAt = titleMatch.index + titleMatch[0].length;
    return `${content.slice(0, insertAt)}\n\n${field}: ${value}${content.slice(insertAt)}`;
  }

  return `${field}: ${value}\n${content}`;
}

function upsertSection(content, heading, body) {
  const section = readSectionRange(content, heading);
  if (!section) {
    return `${content.trimEnd()}\n\n## ${heading}\n\n${body.trim()}\n`;
  }
  return `${content.slice(0, section.bodyStart)}${body.trim()}\n${content.slice(section.bodyEnd)}`;
}

function upsertPreviewSection(content, { disposition, url, pid }) {
  return upsertSection(
    content,
    "Preview",
    `- Owner: ${disposition === "sidecar-used" ? "sidecar" : "worker-temp"}\n- URL: ${url}\n- Disposition: ${disposition}\n- PID: ${pid}\n- Notes: updated by orchestration CLI`
  );
}

function upsertNamedLine(content, name, value) {
  const pattern = new RegExp(
    `((?:^|\\n)\\s*(?:[-*+]\\s+)?${escapeRegExp(name)}\\s*:\\s*)(?:\`?)([^\`\\n]+)(?:\`?)`,
    "i"
  );

  if (pattern.test(content)) {
    return content.replace(pattern, (_match, prefix) => `${prefix}${value}`);
  }

  const section = readSectionRange(content, "Runtime Identity");
  if (!section) {
    return upsertSection(content, "Runtime Identity", `- ${name}: ${value}`);
  }

  const body = section.body.trim();
  const nextBody = `${body ? `${body}\n` : ""}- ${name}: ${value}\n`;
  return `${content.slice(0, section.bodyStart)}${nextBody}${content.slice(section.bodyEnd)}`;
}

function applyReturnToDoc(content, { status, gitFacts, verification, preview }) {
  let updated = upsertTopLevelField(content, "Status", status);
  updated = upsertNamedLine(updated, "Branch", gitFacts.branch ?? "unknown");
  updated = upsertNamedLine(updated, "HEAD", gitFacts.head ?? "unknown");
  updated = upsertNamedLine(updated, "Worktree", gitFacts.worktreePath ?? "unknown");
  updated = upsertSection(updated, "Verification", verification);
  updated = upsertSection(updated, "Return Evidence", `- Status: ${status}\n- Preview: ${preview}`);
  updated = upsertSection(updated, "Gate / Return", `- Result: ${status}\n- Notes: updated by orchestration CLI`);
  return updated;
}

function findSelectedWorkpiece(context) {
  const refs = [
    ...(context.matchedRun?.allRefs ?? []),
    ...(context.matchedAgent?.allRefs ?? []),
  ].map(normalizeRef);

  for (const ref of refs) {
    if (ref.startsWith("workpieces/")) {
      return context.indexedDocs.get(ref) ?? null;
    }
  }

  return null;
}

function moveRunReference(content, { runPath, targetStatus, agentPath }) {
  let updated = removeSectionLineContaining(content, "Active Run References", runPath);
  const targetHeading = targetStatus === "accepted" ? "Accepted Run References" : "Returned Run References";
  updated = addSectionBullet(updated, targetHeading, `- \`${runPath}\`: ${targetStatus} by orchestration CLI.`);

  if (targetStatus === "accepted" && agentPath) {
    updated = removeSectionLineContaining(updated, "Agent References", agentPath);
  }

  return updated;
}

function removeSectionLineContaining(content, heading, needle) {
  const section = readSectionRange(content, heading);
  if (!section) {
    return content;
  }

  const lines = section.body
    .split(/\r?\n/)
    .filter((line) => !line.includes(needle));
  const nextBody = lines.length ? `${lines.join("\n")}\n` : "- none\n";
  return `${content.slice(0, section.bodyStart)}${nextBody}${content.slice(section.bodyEnd)}`;
}

function readGitStatus(repoRoot) {
  if (!repoRoot) {
    return { changedFiles: [], conflicts: [] };
  }

  const output = git(repoRoot, ["status", "--porcelain"], { allowFailure: true });
  const changedFiles = [];
  const conflicts = [];

  for (const line of output.split(/\r?\n/).filter(Boolean)) {
    const status = line.slice(0, 2);
    const file = line.slice(3).trim();
    changedFiles.push(file);
    if (status.includes("U") || status === "AA" || status === "DD") {
      conflicts.push(file);
    }
  }

  return { changedFiles, conflicts };
}

function containsSecretPath(files) {
  return files.some((file) =>
    /(^|\/)(\.env|\.env\..*|.*secret.*|.*token.*)$/i.test(file)
  );
}

function hasVerificationEvidence(content) {
  const section = readSectionRange(content, "Verification")?.body ?? "";
  return /\b(pass|passed|verified|ok|success)\b/i.test(section) && !/\b(fail|failed|error)\b/i.test(section);
}

function readCommitScopePatterns(content) {
  const sections = [
    "Commit Scope",
    "Allowed Commit Scope",
    "Allowed File Scope",
    "Changed Files",
    "Scope",
  ];
  const values = [];

  for (const heading of sections) {
    const body = readSectionRange(content, heading)?.body;
    if (!body) {
      continue;
    }

    values.push(...readReferencePaths(body));
    for (const line of body.split(/\r?\n/)) {
      const value = line
        .replace(/^\s*[-*+]\s+/, "")
        .replace(/^`([^`]+)`.*$/, "$1")
        .trim();
      if (/^[\w./-]+\/?(\*\*)?$/.test(value)) {
        values.push(value.replace(/^\.\//, ""));
      }
    }
  }

  return uniqueStrings(values).filter(Boolean);
}

function fileMatchesScope(file, patterns) {
  return patterns.some((pattern) => {
    const normalized = pattern.replace(/\\/g, "/").replace(/^\.\//, "");
    if (normalized.endsWith("/**")) {
      return file.startsWith(normalized.slice(0, -2));
    }
    if (normalized.endsWith("/")) {
      return file.startsWith(normalized);
    }
    return file === normalized || file.startsWith(`${normalized}/`);
  });
}

function repoRelativePath(repoRoot, rootDir, relativePath) {
  if (!repoRoot) {
    return null;
  }
  return path.relative(repoRoot, path.join(rootDir, relativePath)).replace(/\\/g, "/");
}

function uniqueFiles(files) {
  const seen = new Set();
  const result = [];
  for (const file of files) {
    if (!seen.has(file.relativePath)) {
      seen.add(file.relativePath);
      result.push(file);
    }
  }
  return result;
}

function printPlan(items) {
  for (const item of items) {
    console.log(`  - ${item}`);
  }
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function runAdapterValidation(workspace) {
  const checker = path.join(path.dirname(fileURLToPath(import.meta.url)), "check-shape-strategy-adapter.mjs");

  if (!existsSync(checker)) {
    console.log("  adapter checker unavailable in this installed CLI copy");
    console.log(`  run from the dashboard repo: npm run check:shape-strategy-adapter -- ${workspace}`);
    return;
  }

  try {
    const output = execFileSync(process.execPath, [checker, workspace], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    console.log(output.trim().split(/\r?\n/).map((line) => `  ${line}`).join("\n"));
  } catch (error) {
    const output = error.stdout?.toString() || error.stderr?.toString() || String(error);
    console.log(output.trim().split(/\r?\n/).map((line) => `  ${line}`).join("\n"));
    process.exitCode = 1;
  }
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
  const hasThreadConflict =
    !!threadHint?.value && !!best && !best.doc.content.includes(threadHint.value);
  const confidence = confidenceForScore(best?.score ?? 0, { downgrade: hasThreadConflict });
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
    docs,
    indexedDocs,
    gitFacts,
    threadHint,
    mapDoc,
    confidence,
    matchedBy: best?.reasons ?? [],
    threadConflict: hasThreadConflict,
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

function confidenceForScore(score, { downgrade = false } = {}) {
  if (score >= 80) {
    return downgrade ? "medium" : "high";
  }
  if (score >= 35) {
    return downgrade ? "low" : "medium";
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
