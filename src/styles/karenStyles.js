// Karen look: the art files, and the ruler as thick bamboo that can be read on the meadow.
const ART = "/karen-intro-svgs";

export const KAREN_ART = {
  scene: `${ART}/scene-intro.svg`,
  bambooLeft: `${ART}/bamboo-left.svg`,
  bambooRight: `${ART}/bamboo-right.svg`,
  titleBanner: `${ART}/title-banner.svg`,
  bottomStrip: `${ART}/bottom-background.svg`,
  drum: `${ART}/drum-horns-empty.svg`, // the drum without its ▶: our Play/Pause icon goes on top
  boyStanding: `${ART}/boy-standing.svg`,
  boyWalking: `${ART}/boy-side-walking.svg`, // the art faces right
};

// The scene picture as the Introduction backdrop: its size (1280 x 530), and where the ground
// line goes: 96 picture px above its bottom edge, on the meadow in front of the village (like a
// 1366 x 768 laptop). The ruler and the boy stand there on every screen.
export const KAREN_BACKDROP = { width: 1280, height: 530, groundUp: 96 };
// How the Introduction scene fits (read by SimulationScene):
// --side = room kept free at the left and right of the ruler: phones 8px (no bamboo, so the ruler
// can be long); sm and up 72px (the bamboo); phones turned sideways 40px (the bamboo is thin there).
// --man-scale = how much bigger the boy is: phones turned sideways 1.9 (the most that stays clear of
// the sign and the time box). Phones held upright get their sizes from SimulationScene.
// --ground-at-bottom = 1: the ruler sits near the scene's bottom, not on the picture's meadow spot
// (phones turned sideways: the scene is short, so this gives the boy room).
export const KAREN_SCENE_FIT = "[--side:8px] sm:[--side:72px] sideways:[--side:40px] sideways:[--man-scale:1.9] sideways:[--ground-at-bottom:1]";

// The scene's own colours (from scene-intro.svg): sky to meadow. Shown behind the
// Introduction scene until its picture arrives, so a slow connection shows no empty box.
export const KAREN_SCENE_PLACEHOLDER =
  "bg-[linear-gradient(to_bottom,#5E9ED6_0%,#D6E9EF_55%,#6E9E48_62%,#46703A_100%)]";

// The two view tabs (Stitch look): the open tab is red, the other is light yellow.
// Phones/tablets: they sit on the scene's top edge, so their top corners are round.
// Laptops and phones turned sideways: they hang from the scene's top-left corner, so their bottom corners are round.
export const KAREN_TAB = {
  // The tabs and the Install button, side by side. Phones/tablets: a row above the scene.
  // Laptops and phones turned sideways: floats on the scene's top-left corner, so it uses no height.
  row: "flex items-center gap-3 self-start lg:absolute lg:top-0 lg:left-0 lg:z-20 sideways:absolute sideways:top-0 sideways:left-0 sideways:z-20",
  base: "h-[32px] px-4 flex items-center text-sm font-bold border border-b-0 rounded-t-lg lg:border-t-0 lg:border-b lg:rounded-t-none lg:rounded-b-lg sideways:border-t-0 sideways:border-b sideways:rounded-t-none sideways:rounded-b-lg",
  open: "bg-[#B4262D] border-[#8A1C22] text-white cursor-default select-none",
  closed: "bg-[#FBE28E] border-[#D8B966] text-[#6E1C17] cursor-pointer transition-colors hover:bg-[#F7D877] focus-visible:outline-2 focus-visible:outline-[#B4262D]",
};

// The Install button beside the tabs (Stitch look): a small beige box with a thin brown edge: icon + word
export const KAREN_INSTALL = {
  button: "h-7 pl-2 pr-3 rounded-md flex items-center gap-1 text-sm font-bold cursor-pointer border border-[#78350F]/30 bg-[#EBD9BC] text-[#292524] transition-colors hover:bg-[#CFB794] active:bg-[#BFA47E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4262D]",
  hint: "absolute right-0 top-full mt-2 z-30 w-56 rounded-md border border-[#78350F]/30 bg-[#EBD9BC] px-3 py-2 text-sm text-[#3B2A14] shadow-lg",
};

// The hanging title sign: its ropes start at the top edge of the scene, centered (Introduction only; hidden on phones).
// Short laptop screens: 200px. Phones turned sideways: 150px, so it stays clear of the Install button.
export const KAREN_BANNER = "absolute top-0 left-1/2 -translate-x-1/2 hidden sm:block w-[300px] h-[88px] lg:[@media(max-height:600px)]:w-[200px] lg:[@media(max-height:600px)]:h-[59px] sideways:w-[150px] sideways:h-[44px] pointer-events-none";

// The page behind everything under the scene: light cream, with the rice-field strip along the bottom
export const KAREN_PAGE = {
  bg: "bg-[#F5F9F3]",
  stickyBg: "max-lg:bg-[#F5F9F3]",
  strip: "absolute inset-x-0 bottom-0 -z-10 h-[112px] w-full max-w-none pointer-events-none max-lg:hidden", // laptops only
  // Around the bottom bar. Phones and tablets: none, so the bar is full width on the screen's bottom edge.
  // Laptops: room at the sides, and a gap under it (more on tall screens).
  barWrap: "lg:px-4 lg:pb-2 lg:[@media(min-height:700px)]:pb-8",
};

// Dark wood (Stitch look): light brown at the top to dark brown at the bottom, gold edge, light-gold text
const WOOD = "border-2 border-[#D97706]/40 bg-[linear-gradient(180deg,#6C4122_0%,#4B2B13_50%,#341C0C_100%)] text-[#FDE68A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_3px_6px_rgba(0,0,0,0.35)]";
// Mouse on it: brighter and a little bigger. Pressed: a little smaller. "Reduce motion": no animation.
const PRESSABLE = "transition motion-reduce:transition-none enabled:hover:brightness-125 enabled:hover:scale-108 enabled:active:scale-95";

// The bottom bar (Stitch look): woven rattan (.karen-rattan in index.css) behind dark wood buttons with
// gold text; Reset All is solid red.
// Phones and tablets: full width with a dark line on top, 2 rows (round buttons + drum, then the rest).
// Phone turned sideways (short screen): one row, so the sliders still fit above it.
// Laptops: a rounded pill with a dark edge, one row.
export const KAREN_BAR = {
  box: "karen-rattan relative isolate w-full flex flex-wrap items-center gap-y-2 max-lg:justify-center max-lg:border-t-2 max-lg:border-[#5C3716] max-lg:py-3.5 max-lg:gap-y-2.5 max-sm:px-2 max-sm:gap-x-[5px] sm:max-lg:px-6 sm:max-lg:gap-x-3 sideways:gap-x-2 lg:max-w-[1000px] xl:max-w-[1150px] lg:justify-between lg:py-[18px] lg:[@media(max-height:600px)]:py-[10px] lg:rounded-full lg:border-2 lg:border-[#5C3716]",
  // Laptops: side padding and gaps. The Charts tab uses `compact` instead, so all the buttons fit
  // in one row from 1024px wide.
  roomy: "lg:px-9 lg:gap-x-6",
  compact: "lg:px-4 lg:gap-x-3",
  // Formula, Clear Data and Reset All: icon + word. Phones show only the icon (see iconOnly), so
  // they need no phone padding here (it would squeeze the icon)
  word: "my-1 sideways:my-0 h-10 px-3 sm:px-4 rounded-full flex items-center gap-2 text-sm font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed max-sm:my-0 max-sm:h-9",
  // Phone turned sideways: Formula, Clear Data and Reset All show only their icon, so one row fits
  iconSideways: "sideways:w-9 sideways:h-9 sideways:px-0 sideways:justify-center",
  // Phones (upright or sideways): every round button's icon is 20px, so they match and are easy to see
  icon: "max-sm:size-5 sideways:size-5",
  // Phones: Formula, Clear Data and Reset All show only their icon in a 36px circle, like the other
  // round buttons (the words stay for screen readers)
  iconOnly: "max-sm:w-9 max-sm:px-0 max-sm:justify-center",
  clear: `${WOOD} ${PRESSABLE}`, // Clear Data and Formula
  reset: `border-2 border-[#F59E0B]/50 bg-[#B4262D] text-[#FEF3C7] shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_3px_6px_rgba(0,0,0,0.35)] ${PRESSABLE}`,
  round: `w-9 h-9 sm:w-10 sm:h-10 sideways:w-9 sideways:h-9 rounded-full flex items-center justify-center cursor-pointer ${WOOD} ${PRESSABLE} disabled:opacity-40 disabled:cursor-not-allowed`,
  modeBox: `flex gap-1 p-1 rounded-full ${WOOD} max-lg:order-2 sideways:order-1 max-sm:p-0.5 sideways:p-0.5`,
  // One part of the mode switch (phones: smaller)
  modeOption: "relative px-4 h-8 flex items-center gap-2 rounded-full text-sm font-bold transition-colors max-sm:h-[26px] max-sm:px-2.5 max-sm:text-xs max-sm:gap-1.5 sideways:h-[26px] sideways:px-2.5 sideways:text-xs sideways:gap-1.5",
  modeOn: "bg-[#B4262D] text-[#FEF3C7]",
  modeOff: "text-[#FDE68A]",
  // The drum: 80% of the art's size (86 x 66px) on every screen
  drum: "relative w-[86px] h-[66px] -my-[14px] shrink-0 cursor-pointer transition hover:brightness-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4262D]",
  // The drum's red centre drawn on top at its full 32px, so only the gold ring and the horns get smaller
  drumRed: "absolute left-1/2 top-[32px] size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#7E1A1F] bg-[#B4262D]",
  // The Play / Pause icon on the red centre
  drumIcon: "absolute left-1/2 top-[32px] -translate-x-1/2 -translate-y-1/2 text-white",
};

// The time box (Stitch look): a beige box with a brown edge in the scene's top-right corner on every
// screen (laptops and phones turned sideways have the tabs at the top-left), dark text.
// Phones (upright or sideways): smaller (28px tall, 16px numbers), so the boy has more room.
export const KAREN_TIME = "absolute top-2 right-2 z-10 h-9 min-w-[96px] px-3 flex items-center justify-center rounded-md border-2 border-[#82542A] bg-[#EBD9BC] shadow-sm font-mono text-xl font-bold text-[#1C1917] max-sm:h-7 max-sm:min-w-[72px] max-sm:px-2 max-sm:text-base sideways:h-7 sideways:min-w-[72px] sideways:px-2 sideways:text-base";

// The number box (Stitch look), on every screen and both tabs: beige, thin brown edge,
// number + unit inside. The digits stay 16px, so iPhones don't zoom in.
export const KAREN_NUMBER = {
  // Phones: a fixed 87px box with very little padding and space, so the bar gets more room
  box: "flex items-center gap-px sm:gap-1 whitespace-nowrap h-7 sm:h-8 px-0.5 sm:px-2 w-[87px] sm:w-auto rounded-md border",
  // Record: the beige box you type in
  editable: "border-[#78350F]/40 bg-[#EBE1CE] shadow-inner focus-within:ring-2 focus-within:ring-[#78350F]/40",
  // Playback (read-only): no box, just the number + unit, in the same place
  plain: "border-transparent",
  // Phones: the number gets the room the unit leaves ("-123.45" fits next to m and m/s; next to
  // m/s² up to "-99.99"), with slim digits that still keep the same width (no wiggle).
  // Tablets and laptops: room for 7 characters, typewriter digits.
  number: "flex-1 min-w-0 sm:flex-none sm:w-[62px] bg-transparent text-right font-sans tabular-nums sm:font-mono text-base font-bold text-[#1C1917] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
  unit: "text-xs sm:text-sm font-bold",
};

// The Intro tab's 3 sliders. Phones (Stitch look): one line each, and the 3 lines share
// columns so the bars line up: name (x) | bar | number box.
// Tablets and laptops: name + box, the bar under them, -10 / 10 under its ends.
const INPUT_END = "hidden sm:block sideways:hidden sm:text-sm sm:leading-none sm:text-gray-600 sm:row-start-3"; // -10 and 10: not on phones (longer bar), and not on phones turned sideways (no room)
export const KAREN_INPUT = {
  // Phones: one grid with 3 columns. sm and up: side by side, as before.
  // Phone turned sideways: less room on the left (36px), so the right input clears the bamboo basket
  area: "shrink-0 grid grid-cols-[max-content_1fr_max-content] items-center gap-x-1.5 gap-y-2.5 px-3 py-3 sm:flex sm:flex-row sm:gap-2 sm:px-[72px] sideways:pl-9 sm:py-2",
  // One value. Phones: one line using the area's columns. sm and up: 2 columns, 3 lines.
  row: "col-span-3 grid grid-cols-subgrid items-center sm:flex-1 sm:min-w-0 sm:grid-cols-[1fr_auto] sm:gap-2 sm:p-3 sideways:py-1",
  name: "flex items-center gap-1 whitespace-nowrap text-xs font-bold sm:text-base sm:col-start-1 sm:row-start-1",
  symbol: "text-xs text-stone-700 sm:hidden", // (x) (v) (a): phones only
  min: `${INPUT_END} sm:col-start-1`,
  max: `${INPUT_END} sm:col-start-2 sm:justify-self-end`,
  slider: "sm:col-span-2 sm:row-start-2",
  box: "sm:col-start-2 sm:row-start-1 sm:justify-self-end", // only where the box sits; its look is KAREN_NUMBER
  // Charts tab, phones only: one line above each chart. Each line is its own grid; a fixed
  // name column (it can still grow) and the fixed-width box make the 3 lines line up.
  chartLine: "w-full grid grid-cols-[minmax(6rem,max-content)_1fr_max-content] items-center gap-x-1.5 sm:hidden",
};

export const KAREN_RULER = {
  ground: "#B9C74A", // bamboo body (used when there is no gradient)
  gradient: ["#F2F5C6", "#D9E27A", "#B9C74A", "#9DAE35", "#76881F"], // top to bottom, like round bamboo
  edge: "#4E5E18", // thin dark edge around the bar
  groundWidth: 20, // as long as the ruler (-10 to 10), not the whole scene
  groundHeight: 0.24, // thick, like real bamboo
  tick: "#3A4710", // the joints
  tickWidth: 0.05, // thicker than the plain look
  tickDrop: 0, // joints sit on the bar, not below it
  tickHeight: 0.24, // joints go through the whole bar
  tickLabeledHeight: 0.24,
  labelDrop: 0.2, // numbers right under the bar
  edgeMark: "#CFEAFF", // the end marks when the ruler grows past 10 m: light blue, easy to see on grass
  zero: "#FFE680", // the "0 meters" label
  zeroTick: "#C62828", // the 0 stick: red, so it stands out on the bar
  label: "#FFFFFF",
  outline: "#1F3A0C", // dark edge, so the numbers stand out on any grass
};
