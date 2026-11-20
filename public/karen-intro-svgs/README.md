# Karen intro SVGs

Exported from the "N1 — Introduction (no charts)" board. All files are self-contained (no external fonts/images).

| File | Size | How to use |
|---|---|---|
| `scene-intro.svg` | 1280×530 | Tall landscape, **no boy, no ruler** (girl included). `preserveAspectRatio="xMidYMax slice"`: as `<img>` use `width:100%; height:100%; object-fit:cover; object-position:center bottom`. Short boxes trim the sky; the meadow stays at the bottom. |
| `bamboo-left.svg` | 84×593 (any height) | Left clump + leaf cluster + shirt + seed string. Clump starts ~50px down (clear for the corner tabs). Place at `left:-12px; top:0; width:84px; height:100%`. The bamboo stretches to the height; the hanging items keep their real pixel size and position. |
| `bamboo-right.svg` | 84×593 (any height) | Right clump + leaf cluster + buffalo horn + cloth band + bag. Place at `right:-12px; top:0; width:84px; height:100%`. |
| `bar-background.svg` | 1000×84 (any width) | Woven-mat control-bar background with golden edge and shadow, no buttons. Built without a viewBox, so the **32px round ends stay round at any width**. Use `width:100%; height:84px`. The mat itself is ~74px tall with 6px/3px room for the shadow. |
| `title-banner.svg` | 240×70 (viewBox, scale evenly; **show at 300×88**) | Hanging wooden sign: brown wooden board (grain, knot, hand-cut edges) hung on 2 rattan ropes through 2 holes (ropes start at the very top edge), small red Karen tassels under both ends, and **ကညီ · KAREN** carved in (dark groove + light lower edge). Letters are outlines (from Noto Sans Myanmar / Noto Sans), so it looks right as `<img>` with no fonts. Has `<title>Karen</title>`; as `<img>` use `alt="Karen"`. Use `position:absolute; left:50%; top:0; transform:translateX(-50%); width:300px; height:88px` (1.25×, easier to read on a projector). **Have a native Sgaw Karen speaker check the word ကညီ before release.** |
| `gate-sign.svg` | 150×60 (viewBox, scale evenly) | Village gate sign: brown wooden board with grain and a knot, tied with rattan to 2 bamboo posts, grass tufts at the base, soft ground shadow, and **ကညီ · KAREN** carved in (dark groove + light lower edge). Letters are outlines, so no fonts needed. **Post bottoms = ground line (y = 58 of 60).** Place it in the back meadow, e.g. bottom edge on the far grass line. Alternative to `title-banner.svg` — use one or the other. `alt="Karen"`. |
| `boy-standing.svg` | 60×88 (viewBox 30×44) | Chibi Karen boy, **front view**, arms crossed holding a small rice sheaf. Red striped Karen shirt, red Karen shoulder bag, brown shorts, flip-flops. Use when he is still. Soles on y = 43.5. |
| `boy-side-walking.svg` | 60×88 (viewBox 30×44) | Same boy, **side view facing right**, mid-stride, bag at the hip. Use while moving; face left with `transform: scaleX(-1)`. Soles on y = 43.5, so swapping never makes him jump. |
| ↳ both | | Transparent, no shadow. **Soles exactly on y = 43.5** and same head/body size, so swapping standing ↔ walking never makes him jump. Anchor bottom-centre; scale evenly (keep 12:22). |
| `drum-horns.svg` | 108×82 | Frog-drum Play button (red centre + ▶) with the two emblem horns and red ropes. Put it inside your `<button aria-label="Play">`. |
| `bottom-background.svg` | 1920×112 (any width) | Green strip at the bottom (16px), left corner (frog, rice sheaf, sickle, basket + hat, dragonfly, butterfly, shoots, mushrooms, moss, grass) and right corner (fern, stones, grass, shoots). **Transparent everywhere else.** Built without a viewBox: **left items stay pinned left, right items pinned right**. Use `position:absolute; left:0; right:0; bottom:0; height:112px` (CSS background or inline). |

Notes
- `bar-background.svg` uses `calc()` for rect widths (SVG 2). Works in Chrome/Edge/Safari; test Firefox in your target setup.
- Decorative: use `alt=""` + `aria-hidden="true"` on all except the drum (that is your Play button's content) and the title or gate sign (`alt="Karen"`).
