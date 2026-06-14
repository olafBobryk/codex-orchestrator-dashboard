# Canvas Layout Cases

Focused local workspaces for region and marker rendering diagnostics. Each case
keeps one variable dominant so layout failures are easier to see.

Open with:

```text
http://127.0.0.1:26339/?workspace=<absolute case path>
```

Cases:

- `nested-regions`: explicit parent/child regions plus inferred subset nesting.
- `promoted-markers`: covered node markers, multiple markers on one node, one loader.
- `overlap-regions`: identical and partial overlap labels without deep nesting.
- `cross-region-links`: sibling/cousin link crossings without marker noise.
