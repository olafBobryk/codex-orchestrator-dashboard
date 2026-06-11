# Shape: Panel Inspection

Status: active

## Intent

Show how focused Markdown inspection can be represented without turning the
dashboard into an editor.

## Workpiece References

- `workpieces/panel-open.md`: opens the inspection surface.
- `workpieces/panel-close.md`: closes the inspection surface cleanly.
- `workpieces/markdown-render.md`: renders Markdown content read-only.
- `workpieces/reference-routing.md`: routes references to inspection.
- `workpieces/empty-state.md`: handles missing content.
- `workpieces/error-state.md`: handles failed reads.

## Fixed Decisions

- Markdown inspection is read-only.
- Editing remains outside the dashboard.

## Autonomous Decisions

- Use concise UI states in the example language.

## Escalation Triggers

- Escalate if this starts describing an in-app editor.

## Return Evidence

- A focused panel-inspection shape with six concrete workpieces.

## Run References

- none

## Commit Evidence

- none
