/* ============================================================
   Infinite Circle Field
   Plain JS, no dependencies. All tunables come from styles.css.
   ============================================================ */

(function () {
  'use strict';

  var field = document.getElementById('field');
  var overlay = document.getElementById('overlay');

  /* Extra rows kept mounted above the viewport before recycling. */
  var BUFFER = 4;
  /* Runway kept mounted below the viewport, as a multiple of viewport height.
     Enough that fast or momentum scrolling never reaches the bottom of the
     document before the next rows have been appended. */
  var RUNWAY = 1;
  /* Cap on the left-to-right ripple delay when a new row arrives. */
  var MAX_STAGGER = 200;

  /* ---------- Read tunables from CSS ---------- */

  var css = getComputedStyle(document.documentElement);

  function cssVar(name) {
    return css.getPropertyValue(name).trim();
  }

  function cssPx(name) {
    return parseFloat(cssVar(name)) || 0;
  }

  var cellSize, circleDark, circleLight, overlayStart, overlayEnd;

  function readTunables() {
    css = getComputedStyle(document.documentElement);
    cellSize = cssPx('--cell-size') || 64;
    circleDark = parseHex(cssVar('--circle-dark'));
    circleLight = parseHex(cssVar('--circle-light'));
    overlayStart = parseHex(cssVar('--overlay-start'));
    overlayEnd = parseHex(cssVar('--overlay-end'));
  }

  /* ---------- Color helpers ---------- */

  function parseHex(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    var n = parseInt(h, 16);
    if (isNaN(n)) return [0, 0, 0];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function lerpColor(a, b, t) {
    return 'rgb(' +
      Math.round(a[0] + (b[0] - a[0]) * t) + ',' +
      Math.round(a[1] + (b[1] - a[1]) * t) + ',' +
      Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }

  /* Deterministic pseudo-random in [0,1) from a cell's coordinates.
     Rows recycled out of the DOM must come back with the same colors,
     so color cannot be drawn from Math.random() at creation time. */
  function hash2(x, y) {
    var h = (x * 0x1f1f1f1f) ^ (y * 0x27d4eb2d);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  /* ---------- Grid state ---------- */

  var cols = 0;
  var firstRow = 0;  /* index of the topmost row currently in the DOM */
  var lastRow = -1;  /* index of the bottommost row currently in the DOM */

  function computeCols() {
    return Math.max(1, Math.floor(window.innerWidth / cellSize));
  }

  function buildRow(rowIndex) {
    var row = document.createElement('div');
    row.className = 'row';
    row.style.gridTemplateColumns = 'repeat(' + cols + ', ' + cellSize + 'px)';

    var frag = document.createDocumentFragment();
    for (var c = 0; c < cols; c++) {
      var dot = document.createElement('div');
      dot.className = 'dot';
      dot.style.background = lerpColor(circleDark, circleLight, hash2(c, rowIndex));
      dot.style.transitionDelay = Math.min(c * 12, MAX_STAGGER) + 'ms';
      frag.appendChild(dot);
    }
    row.appendChild(frag);
    return row;
  }

  /* Rows built while the tab is in the background wait here. Browsers freeze
     transitions in a hidden document, which would leave those circles stuck
     invisible; instead they fade in when the viewer actually looks at them. */
  var pending = [];

  function markIn(row) {
    var dots = row.children;
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.add('is-in');
    }
  }

  /* Reveal on the next frame so the transition actually runs. */
  function revealRow(row) {
    if (document.hidden) {
      pending.push(row);
      return;
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        markIn(row);
      });
    });
  }

  function flushPending() {
    if (document.hidden) return;
    var queued = pending;
    pending = [];
    for (var i = 0; i < queued.length; i++) {
      /* Skip rows recycled out of the DOM while we were hidden. */
      if (queued[i].parentNode) revealRow(queued[i]);
    }
  }

  /* padding-top always equals firstRow * cellSize. Keeping that invariant
     means removing or prepending rows never shifts the content below. */
  function syncPadding() {
    field.style.paddingTop = (firstRow * cellSize) + 'px';
  }

  /* Row indices bounding the window of rows that should be mounted. */
  function rowAbove(scroll) {
    return Math.max(0, Math.floor(scroll / cellSize) - BUFFER);
  }

  function rowBelow(scroll) {
    return Math.floor((scroll + window.innerHeight * (1 + RUNWAY)) / cellSize) + BUFFER;
  }

  function update() {
    var scroll = window.scrollY || window.pageYOffset || 0;
    var desiredFirst = rowAbove(scroll);
    var desiredLast = rowBelow(scroll);

    /* Append below */
    while (lastRow < desiredLast) {
      lastRow++;
      var below = buildRow(lastRow);
      field.appendChild(below);
      revealRow(below);
    }

    /* Prepend above (scrolling back up) */
    while (firstRow > desiredFirst) {
      firstRow--;
      var above = buildRow(firstRow);
      field.insertBefore(above, field.firstChild);
      revealRow(above);
    }

    /* Recycle rows that have scrolled out of the top buffer */
    while (firstRow < desiredFirst && field.firstChild) {
      field.removeChild(field.firstChild);
      firstRow++;
    }

    /* Recycle rows below the bottom buffer (happens after a resize) */
    while (lastRow > desiredLast && field.lastChild) {
      field.removeChild(field.lastChild);
      lastRow--;
    }

    syncPadding();
  }

  /* ---------- Scroll ---------- */

  var ticking = false;

  function onScroll() {
    hideOverlay();
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      update();
    });
  }

  /* ---------- Resize ---------- */

  function rebuild() {
    readTunables();
    cols = computeCols();

    /* Anchor the rebuild to whatever the viewer is currently looking at. */
    var scroll = window.scrollY || window.pageYOffset || 0;
    var first = rowAbove(scroll);
    var last = rowBelow(scroll);

    /* Build the replacement rows before detaching the old ones. Emptying the
       grid first would collapse the document height, and the browser would
       clamp the scroll position, yanking the viewer upward. */
    var frag = document.createDocumentFragment();
    var built = [];
    for (var r = first; r <= last; r++) {
      var row = buildRow(r);
      frag.appendChild(row);
      built.push(row);
    }

    field.textContent = '';
    firstRow = first;
    lastRow = last;
    syncPadding();
    field.appendChild(frag);

    /* Height is restored, so the original offset is reachable again. */
    if (Math.abs((window.scrollY || window.pageYOffset || 0) - scroll) > 1) {
      window.scrollTo(0, scroll);
    }

    for (var i = 0; i < built.length; i++) revealRow(built[i]);
    update();
  }

  var resizeTimer = null;

  function onResize() {
    hideOverlay();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (computeCols() !== cols) {
        rebuild();
      } else {
        update();
      }
    }, 150);
  }

  /* ---------- Hover overlay ---------- */

  function showOverlay(dot) {
    var r = dot.getBoundingClientRect();
    var x = r.left + r.width / 2;
    var y = r.top + r.height / 2;
    overlay.style.background = lerpColor(overlayStart, overlayEnd, Math.random());
    overlay.style.transform =
      'translate(' + x + 'px, ' + y + 'px) translate(-50%, -50%) scale(1)';
    overlay.classList.add('is-visible');
  }

  function hideOverlay() {
    if (!overlay.classList.contains('is-visible')) return;
    overlay.classList.remove('is-visible');
    overlay.style.transform =
      overlay.style.transform.replace('scale(1)', 'scale(.85)');
  }

  field.addEventListener('pointerover', function (e) {
    var dot = e.target.closest('.dot');
    if (dot) showOverlay(dot);
  });

  field.addEventListener('pointerout', function (e) {
    if (!e.target.closest('.dot')) return;
    var to = e.relatedTarget;
    /* Ignore moves from one dot straight to another; that fires its own
       pointerover and would otherwise flicker the overlay off and on. */
    if (to && to.closest && to.closest('.dot')) return;
    hideOverlay();
  });

  /* ---------- Go ---------- */

  document.addEventListener('visibilitychange', flushPending);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);

  rebuild();
})();
