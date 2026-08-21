# Conceptual Art Project

## Background
This will be an interactive conceptual art project that I'm building for a colleague. The visual concept is a series of circles on the page, in a grid format, that extend indefinitely (infinite scroll). The circles will be a solid color, randomized from a range between two colors. To begin with, the range should be from a medium-dark brown to a light brown. When a user rolls over a circle, a larger circle will be displayed, as an overlay on top of the grid. The larger circle will have a solid color fill of light yellow to an almost white cream color. When a user moves off a circle, the overlay disappears. 

## Specs
- Display a series of small to medium size circles on the page in a grid.
- The circles should be evenly spaced in the grid.
- The fill color should be randomized from a range between two colors (medium-dark brown to light brown).
- When a user rolls over a circle, a larger circle will be displayed as an overlay on top of the grid.
- The larger circle will have a solid color fill of light yellow to an almost white cream color.
- Allow us to set the two colors of each range.
- The page background should be black.
- When a user moves off a circle, the overlay disappears.
- When the page is scrolled, more circles appear. It should function as an infinite scroll.
- The UI should use medium-fast transitions to display and hide the larger circle and to display new circles via the infinite scroll.
- The application should be simple HTML, CSS, and JavaScript. It should be deployable as static files (no build systems, Sass, etc.).
- Use dependencies only if needed, otherwise, keep it plain JavaScript.

## Resolved decisions
These were open in the spec above and have been settled:
- **Overlay placement** — the large circle is concentric with the hovered circle, blooming
  outward from it, rather than appearing at a fixed point on screen.
- **Color configuration** — the four range endpoints are CSS custom properties in
  `styles.css`, editable without touching JavaScript. `app.js` reads them at runtime.
- **Infinite scroll** — rows append as you scroll and rows far above the viewport are
  removed, keeping the DOM at a constant size so the field scrolls indefinitely without
  degrading.
- **Overlay color** — randomized fresh on each hover within the yellow-to-cream range.

## Implementation notes
- Circle colors are derived from a hash of each circle's `(column, row)` coordinates, not
  from `Math.random()`. Recycled rows must return with the colors they had before, or
  scrolling back up would repaint the field.
- The grid's `padding-top` is always `firstRow * cellSize`. Maintaining that invariant is
  what keeps the scroll position steady as rows are added and removed at either end.
- On resize the replacement rows are built before the old ones are detached; emptying the
  grid first would collapse the document height and cause the browser to clamp the scroll
  position.

## Files
- `index.html` — markup: the grid container and the overlay element.
- `styles.css` — all tunable values (`:root`), grid, circle, and overlay styles.
- `app.js` — grid generation, color assignment, scroll recycling, hover overlay.
- `README.md` — how to run, deploy, and retune the piece.
