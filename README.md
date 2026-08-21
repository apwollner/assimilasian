# Field

An interactive conceptual piece: an endless grid of brown circles on black. Hovering a
circle blooms a large cream circle over the field; moving away dismisses it. Scrolling
reveals more circles, without end.

## Running it

There is no build step and there are no dependencies. Any static file server works:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
```

To deploy, upload `index.html`, `styles.css`, and `app.js` to any static host
(Netlify, GitHub Pages, S3, or a plain web server). Nothing needs to be compiled.

Opening `index.html` directly from the filesystem also works.

## Tuning the piece

Every adjustable value lives in one block at the top of `styles.css`. Edit it and
reload — no JavaScript changes needed.

```css
:root {
  --bg: #000000;

  --circle-dark:   #6b4423;  /* grid circles: fill is randomized... */
  --circle-light:  #b98a53;  /* ...between these two colors */

  --overlay-start: #fff7c2;  /* hover circle: fill is randomized... */
  --overlay-end:   #fffdf2;  /* ...between these two colors */

  --circle-size: 28px;       /* diameter of a grid circle */
  --cell-size: 64px;         /* grid pitch; spacing = cell-size - circle-size */
  --overlay-size: 240px;     /* diameter of the hover circle */

  --fade-in: 320ms;          /* new circles arriving as you scroll */
  --overlay-in: 200ms;       /* hover circle appearing */
  --overlay-out: 160ms;      /* hover circle dismissing */
}
```

Notes on the ranges:

- Each grid circle picks a random point between `--circle-dark` and `--circle-light`.
  The two colors can be anything; they need not be browns.
- The hover circle picks a fresh random point between `--overlay-start` and
  `--overlay-end` on every hover, so no two reveals are quite the same.
- Widening the gap between the two colors of a range makes the field more mottled;
  narrowing it makes the field more uniform.
- `--cell-size` controls density. Circles stay centered in their cells, so raising it
  spreads the field out without changing the circles themselves.

## How it works

`app.js` is plain JavaScript, roughly 200 lines, no libraries.

- **Layout.** Columns are recomputed from the window width as `floor(width / cell-size)`,
  so the grid stays centered and evenly spaced at any size.
- **Color.** A circle's color is derived from a hash of its `(column, row)` coordinates
  rather than from `Math.random()`. This matters because of recycling, below: a row that
  leaves the DOM and is later rebuilt comes back with exactly the colors it had before.
- **Infinite scroll.** Only the rows near the viewport are kept in the DOM — roughly the
  visible rows plus a buffer above and a full viewport of runway below. Rows that scroll
  out of range are removed, and the grid's `padding-top` is grown by exactly the height
  removed, so nothing shifts and the scroll position holds. The document keeps getting
  longer as you descend while the number of elements stays constant.
- **Hover.** A single reusable overlay element is positioned over the hovered circle using
  its bounding rect. Pointer events are used rather than mouse events, so a tap also works
  on touch devices.

The piece respects `prefers-reduced-motion`, and defers fading circles in until the tab is
actually visible so a page opened in a background tab is not left blank.
