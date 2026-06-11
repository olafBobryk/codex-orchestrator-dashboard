import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export const ORCHESTRATION_DIR = ".codex-orchestration";

export type DocKind =
  | "architecture"
  | "packet"
  | "ledger"
  | "handoff"
  | "concern"
  | "gate"
  | "verification"
  | "preview";

export type DocGroup = "Core" | "Packets" | "Ledgers" | "Doc Summaries";

export type OrchestrationDoc = {
  kind: DocKind;
  group: DocGroup;
  label: string;
  name: string;
  relativePath: string;
  content: string;
  title: string;
  excerpt: string;
  status: string | null;
  updatedAt: string | null;
  size: number;
};

export type WorkspaceReadResult = {
  workspace: string;
  resolvedWorkspace: string | null;
  orchestrationPath: string | null;
  state: "missing_workspace" | "missing_directory" | "ready" | "error";
  message: string;
  docs: OrchestrationDoc[];
  counts: {
    docs: number;
    packets: number;
    ledgers: number;
    handoffs: number;
    summaries: number;
  };
};

const singleDocs: Array<{
  kind: DocKind;
  group: DocGroup;
  label: string;
  relativePath: string;
}> = [
  {
    kind: "architecture",
    group: "Core",
    label: "Architecture",
    relativePath: "architecture.md",
  },
  {
    kind: "concern",
    group: "Doc Summaries",
    label: "Concerns",
    relativePath: "concerns.md",
  },
  {
    kind: "gate",
    group: "Doc Summaries",
    label: "Gates",
    relativePath: "gates.md",
  },
  {
    kind: "verification",
    group: "Doc Summaries",
    label: "Verification",
    relativePath: "verification.md",
  },
  {
    kind: "preview",
    group: "Doc Summaries",
    label: "Preview",
    relativePath: "preview.md",
  },
];

const directoryDocs: Array<{
  kind: DocKind;
  group: DocGroup;
  label: string;
  directory: string;
}> = [
  { kind: "packet", group: "Packets", label: "Packet", directory: "packets" },
  { kind: "ledger", group: "Ledgers", label: "Ledger", directory: "ledgers" },
  {
    kind: "handoff",
    group: "Doc Summaries",
    label: "Handoff",
    directory: "handoffs",
  },
];

export async function readWorkspace(
  workspaceInput: string | undefined
): Promise<WorkspaceReadResult> {
  const workspace = (workspaceInput ?? "").trim();

  if (!workspace) {
    return emptyResult({
      workspace,
      state: "missing_workspace",
      message: "Enter a workspace path to read local orchestration docs.",
    });
  }

  const resolvedWorkspace = path.resolve(/*turbopackIgnore: true*/ workspace);
  const orchestrationPath = path.join(
    /*turbopackIgnore: true*/ resolvedWorkspace,
    ORCHESTRATION_DIR
  );

  try {
    const directory = await stat(/*turbopackIgnore: true*/ orchestrationPath);

    if (!directory.isDirectory()) {
      return emptyResult({
        workspace,
        resolvedWorkspace,
        orchestrationPath,
        state: "missing_directory",
        message: `${ORCHESTRATION_DIR} exists but is not a directory.`,
      });
    }

    const docs = await readDocs(orchestrationPath);

    return {
      workspace,
      resolvedWorkspace,
      orchestrationPath,
      state: "ready",
      message:
        docs.length > 0
          ? "Workspace loaded from project-local Markdown."
          : `${ORCHESTRATION_DIR} is present but no Markdown docs were found.`,
      docs,
      counts: countDocs(docs),
    };
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : null;

    if (code === "ENOENT") {
      return emptyResult({
        workspace,
        resolvedWorkspace,
        orchestrationPath,
        state: "missing_directory",
        message: `No ${ORCHESTRATION_DIR} directory found in this workspace.`,
      });
    }

    return emptyResult({
      workspace,
      resolvedWorkspace,
      orchestrationPath,
      state: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to read orchestration docs.",
    });
  }
}

function emptyResult({
  workspace,
  resolvedWorkspace = null,
  orchestrationPath = null,
  state,
  message,
}: {
  workspace: string;
  resolvedWorkspace?: string | null;
  orchestrationPath?: string | null;
  state: WorkspaceReadResult["state"];
  message: string;
}): WorkspaceReadResult {
  return {
    workspace,
    resolvedWorkspace,
    orchestrationPath,
    state,
    message,
    docs: [],
    counts: {
      docs: 0,
      packets: 0,
      ledgers: 0,
      handoffs: 0,
      summaries: 0,
    },
  };
}

async function readDocs(orchestrationPath: string): Promise<OrchestrationDoc[]> {
  const docs: OrchestrationDoc[] = [];

  for (const doc of singleDocs) {
    const loaded = await readOptionalDoc({
      orchestrationPath,
      relativePath: doc.relativePath,
      kind: doc.kind,
      group: doc.group,
      label: doc.label,
    });

    if (loaded) {
      docs.push(loaded);
    }
  }

  for (const directory of directoryDocs) {
    docs.push(
      ...(await readDirectoryDocs({
        orchestrationPath,
        directory: directory.directory,
        kind: directory.kind,
        group: directory.group,
        label: directory.label,
      }))
    );
  }

  return docs.sort((a, b) => {
    if (a.group !== b.group) {
      return groupOrder(a.group) - groupOrder(b.group);
    }

    return a.relativePath.localeCompare(b.relativePath);
  });
}

async function readOptionalDoc({
  orchestrationPath,
  relativePath,
  kind,
  group,
  label,
}: {
  orchestrationPath: string;
  relativePath: string;
  kind: DocKind;
  group: DocGroup;
  label: string;
}): Promise<OrchestrationDoc | null> {
  const targetPath = path.join(
    /*turbopackIgnore: true*/ orchestrationPath,
    relativePath
  );

  try {
    const [content, fileStat] = await Promise.all([
      readFile(/*turbopackIgnore: true*/ targetPath, "utf8"),
      stat(/*turbopackIgnore: true*/ targetPath),
    ]);

    return createDoc({
      orchestrationPath,
      relativePath,
      kind,
      group,
      label,
      fileStat,
      content,
    });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : null;

    if (code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function readDirectoryDocs({
  orchestrationPath,
  directory,
  kind,
  group,
  label,
}: {
  orchestrationPath: string;
  directory: string;
  kind: DocKind;
  group: DocGroup;
  label: string;
}): Promise<OrchestrationDoc[]> {
  const directoryPath = path.join(
    /*turbopackIgnore: true*/ orchestrationPath,
    directory
  );

  try {
    const entries = await readdir(/*turbopackIgnore: true*/ directoryPath, {
      withFileTypes: true,
    });
    const markdownFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => path.join(directory, entry.name))
      .sort((a, b) => a.localeCompare(b));

    const docs = await Promise.all(
      markdownFiles.map((relativePath) =>
        readOptionalDoc({
          orchestrationPath,
          relativePath,
          kind,
          group,
          label,
        })
      )
    );

    return docs.filter((doc): doc is OrchestrationDoc => Boolean(doc));
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : null;

    if (code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function createDoc({
  relativePath,
  kind,
  group,
  label,
  fileStat,
  content,
}: {
  orchestrationPath: string;
  relativePath: string;
  kind: DocKind;
  group: DocGroup;
  label: string;
  fileStat: Awaited<ReturnType<typeof stat>>;
  content: string;
}): OrchestrationDoc {
  const name = path.basename(relativePath);
  const title = extractTitle(content) ?? titleFromFileName(name);

  return {
    kind,
    group,
    label,
    name,
    relativePath,
    content,
    title,
    excerpt: extractExcerpt(content),
    status: extractStatus(content),
    updatedAt: fileStat.mtime.toISOString(),
    size: Number(fileStat.size),
  };
}

function extractTitle(content: string) {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

function titleFromFileName(fileName: string) {
  return fileName
    .replace(/\.md$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function extractExcerpt(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .filter((line) => !/^\|?[-:\s|]+\|?$/.test(line));

  const excerpt = lines.slice(0, 4).join(" ");

  if (!excerpt) {
    return "No summary text found in this Markdown file.";
  }

  return truncate(excerpt, 260);
}

function extractStatus(content: string) {
  const labeled = content.match(/^(?:[-*]\s*)?(?:status|state):\s*(.+)$/im);

  if (labeled?.[1]) {
    return truncate(labeled[1].trim(), 80);
  }

  const table = content.match(/\|\s*(?:status|state)\s*\|\s*([^|\n]+)\|/i);

  if (table?.[1]) {
    return truncate(table[1].trim(), 80);
  }

  return null;
}

function countDocs(docs: OrchestrationDoc[]): WorkspaceReadResult["counts"] {
  return {
    docs: docs.length,
    packets: docs.filter((doc) => doc.kind === "packet").length,
    ledgers: docs.filter((doc) => doc.kind === "ledger").length,
    handoffs: docs.filter((doc) => doc.kind === "handoff").length,
    summaries: docs.filter((doc) =>
      ["concern", "gate", "verification", "preview"].includes(doc.kind)
    ).length,
  };
}

function groupOrder(group: DocGroup) {
  return ["Core", "Packets", "Ledgers", "Doc Summaries"].indexOf(group);
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trim()}...`;
}
