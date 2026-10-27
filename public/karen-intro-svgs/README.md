# Karen intro SVGs

Exported from the "N1 — Introduction (no charts)" board. All files are self-contained (no external fonts/images).

| File | Size | How to use |
|---|---|---|
| `scene-intro.svg` | 1280×530 | Tall landscape, **no boy, no ruler** (girl included). `preserveAspectRatio="xMidYMax slice"`: as `<img>` use `width:100%; height:100%; object-fit:cover; object-position:center bottom`. Short boxes trim the sky; the meadow stays at the bottom. |
| `bamboo-left.svg` | 84×593 (any height) | Left clump + leaf cluster + shirt + seed string. Clump starts ~50px down (clear for the corner tabs). Place at `left:-12px; top:0; width:84px; height:100%`. The bamboo stretches to the height; the hanging items keep their real pixel size and position. |
| `bamboo-right.svg` | 84×593 (any height) | Right clump + leaf cluster + buffalo horn + cloth band + bag. Place at `right:-12px; top:0; width:84px; height:100%`. |
| `bar-background.svg` | 1000×84 (any width) | Woven-mat control-bar background with golden edge and shadow, no buttons. Built without a viewBox, so the **32px round ends stay round at any width**. Use `width:100%; height:84px`. The mat itself is ~74px tall with 6px/3px room for the shadow. |
| `tab-background.svg` | 196×44 (any width) | Woven-mat strip behind the view tabs (Introduction / Charts): golden edge on the right and bottom, square top-left corner, 12px rounded bottom-right, soft shadow. **Background only** — draw your tab buttons on top (active tab red via CSS). The strip itself is 39px tall; the extra 4–5px is shadow room. Use `position:absolute; left:0; top:0; width:<tabs width + 4px>; height:44px`. Built without a viewBox, so the round corner stays round at any width. |
| `boy-standing.svg` | 60×88 (viewBox 30×44) | Chibi Karen boy, **front view**, arms crossed holding a small rice sheaf. Red striped Karen shirt, red Karen shoulder bag, brown shorts, flip-flops. Use when he is still. Soles on y = 43.5. |
| `boy-side-walking.svg` | 60×88 (viewBox 30×44) | Same boy, **side view facing right**, mid-stride, bag at the hip. Use while moving; face left with `transform: scaleX(-1)`. Soles on y = 43.5, so swapping never makes him jump. |
| ↳ both | | Transparent, no shadow. **Soles exactly on y = 43.5** and same head/body size, so swapping standing ↔ walking never makes him jump. Anchor bottom-centre; scale evenly (keep 12:22). |
| `drum-horns.svg` | 108×82 | Frog-drum Play button (red centre + ▶) with the two emblem horns and red ropes. Put it inside your `<button aria-label="Play">`. |
| `bottom-background.svg` | 1920×112 (any width) | Green strip, soil dots, rice field, left corner (frog, shoots, mushrooms, moss, sheaf, sickle, basket + hat, dragonfly, butterfly) and right corner (fern, stones, grass, shoots). Built without a viewBox: **left items stay pinned left, right items pinned right**, rice fills the middle and fades at both ends. Use `position:absolute; left:0; right:0; bottom:0; width:100%; height:112px`. Put your control bar above it (z-index) — the rice is meant to sit behind the bar. |

Notes
- `bar-background.svg` and `tab-background.svg` use `calc()` for rect widths (SVG 2). Works in Chrome/Edge/Safari; test Firefox in your target setup.
- Decorative: use `alt=""` + `aria-hidden="true"` on all except the drum (that is your Play button's content).
