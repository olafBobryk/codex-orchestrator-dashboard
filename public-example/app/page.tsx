const workpieces = [
  {
    id: "template-clone",
    label: "Template clone",
    shape: "Initialization",
    state: "accepted",
    x: 20,
    y: 18,
  },
  {
    id: "strategy-seed",
    label: "Strategy seed",
    shape: "Initialization",
    state: "accepted",
    x: 42,
    y: 32,
  },
  {
    id: "legacy-inventory",
    label: "Legacy inventory",
    shape: "Documentation baseline",
    state: "active",
    x: 64,
    y: 46,
  },
  {
    id: "pressure-ledger",
    label: "Pressure ledger",
    shape: "Documentation baseline",
    state: "planned",
    x: 82,
    y: 64,
  },
];

const details = [
  ["Source", "Plain Markdown shape-strategy docs"],
  ["Projection", "Workpieces as nodes, shapes as regions"],
  ["Runtime", "Static public demo, no local filesystem"],
  ["Tests", "4/4 sample checks recorded"],
];

export default function Page() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Codex Orchestration</p>
          <h1>Shape strategy graph</h1>
          <p className="lede">
            A public static example of the dashboard surface. The real sidecar
            runs locally and reads project Markdown from{" "}
            <code>.codex-orchestration/</code>.
          </p>
        </div>
        <nav aria-label="Example projects">
          <a className="project active" href="#graph">
            <span>
              <strong>Averlo Rebrand</strong>
              <small>example workspace</small>
            </span>
            <b>2</b>
          </a>
          <a className="project" href="#notes">
            <span>
              <strong>Dashboard Source</strong>
              <small>canonical strategy</small>
            </span>
            <b>0</b>
          </a>
        </nav>
      </aside>

      <section id="graph" className="canvas" aria-label="Static graph example">
        <div className="region initialization" />
        <div className="region baseline" />
        <svg className="edges" viewBox="0 0 100 80" aria-hidden="true">
          <path d="M20 18 C30 20, 35 28, 42 32" />
          <path d="M42 32 C52 36, 57 41, 64 46" />
          <path d="M64 46 C72 52, 78 58, 82 64" />
        </svg>
        <div className="checkpoint start">Start</div>
        {workpieces.map((node) => (
          <article
            className={`node ${node.state}`}
            key={node.id}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <span>{node.shape}</span>
            <strong>{node.label}</strong>
          </article>
        ))}
        <div className="marker">worker</div>
      </section>

      <aside id="notes" className="detail-panel">
        <p className="eyebrow">Overview</p>
        <h2>Static projection sample</h2>
        <p>
          This example is intentionally read-only. It demonstrates the public
          shape of the orchestration graph without exposing local workspace
          paths, Codex runtime state, or private docs.
        </p>
        <div className="details">
          {details.map(([label, value]) => (
            <div className="detail" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <a
          className="source-link"
          href="https://github.com/olafBobryk/codex-orchestrator-dashboard/tree/codex/public-static-example/public-example"
        >
          View static example source
        </a>
      </aside>
    </main>
  );
}
