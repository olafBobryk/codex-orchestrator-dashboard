# Markdown Viewer Feature Test

This fixture exercises the read-only Markdown viewer with common Markdown and
GitHub-flavored Markdown features. It is intentionally local, inert, and
inspection-only.

## Inline Text

Plain text can include **strong text**, *emphasis*, ***combined emphasis***,
~~strikethrough~~, `inline code`, and a [relative-style reference](architecture.md).

Hard line break follows here.  
This line should appear directly below the previous sentence.

Autolinks should render as links: <https://example.com>.

## Blockquote

> A blockquote should sit on the same surface system as the rest of the panel.
>
> - It can contain list content.
> - It should remain readable at normal dashboard distance.

## Lists

- Unordered parent item
  - Nested unordered item
  - Another nested item with `code`
- Second parent item

1. Ordered parent item
2. Ordered item with nested content
   1. Nested ordered item
   2. Another nested ordered item

## Task List

- [x] Render checked task item
- [ ] Render unchecked task item
- [x] Preserve compact spacing

## Table

| Feature | Expected Result | State |
| --- | --- | --- |
| Table header | Clear surface contrast | Pass |
| Long cell text | Wraps without breaking the panel layout | Pass |
| Inline `code` | Uses monospace treatment | Pass |

## Code

Inline code appears in sentence flow: `const panel = "markdown";`.

```tsx
export function ViewerState() {
  return <section data-state="read-only">Markdown only</section>;
}
```

Indented code should also remain readable:

    npm run lint
    npm run build

## Media

![Placeholder image for Markdown rendering](https://placehold.co/320x120?text=Markdown+image)

## Footnote

The viewer should support footnote references when the parser does.[^viewer]

[^viewer]: This is a footnote rendered through the Markdown parser.

## Separators

---

Thematic breaks should create a quiet divider, not a second card.

## Raw HTML

Raw HTML should remain inert unless the renderer is explicitly changed to allow
it.

<button>This should not become an active dashboard control.</button>
