// Karen look: the art files, and the ruler as thick bamboo that can be read on the meadow.
const ART = "/karen-intro-svgs";

export const KAREN_ART = {
  scene: `${ART}/scene-intro.svg`,
  bambooLeft: `${ART}/bamboo-left.svg`,
  bambooRight: `${ART}/bamboo-right.svg`,
  titleBanner: `${ART}/title-banner.svg`,
  bottomStrip: `${ART}/bottom-background.svg`,
  barBackground: `${ART}/bar-background-tall.svg`, // a copy of bar-background.svg whose height stretches (one or two rows of buttons)
  drum: `${ART}/drum-horns-empty.svg`, // the drum without its ▶: our Play/Pause icon goes on top
  boyStanding: `${ART}/boy-standing.svg`,
  boyWalking: `${ART}/boy-side-walking.svg`, // the art faces right
};

// The scene's own colours (from scene-intro.svg): sky to meadow. Shown behind the
// Introduction scene until its picture arrives, so a slow connection shows no empty box.
export const KAREN_SCENE_PLACEHOLDER =
  "bg-[linear-gradient(to_bottom,#5E9ED6_0%,#D6E9EF_55%,#6E9E48_62%,#46703A_100%)]";

// The two view tabs (Stitch look): the open tab is red, the other is light yellow.
// Phones/tablets: they sit on the scene's top edge, so their top corners are round.
// Laptops: they hang from the scene's top-left corner, so their bottom corners are round.
export const KAREN_TAB = {
  // The tabs and the Install button, side by side. Phones/tablets: a row above the scene.
  // Laptops: floats on the scene's top-left corner, so it uses no height.
  row: "flex items-center gap-3 self-start lg:absolute lg:top-0 lg:left-0 lg:z-20",
  base: "h-[32px] px-4 flex items-center text-sm font-bold border border-b-0 rounded-t-lg lg:border-t-0 lg:border-b lg:rounded-t-none lg:rounded-b-lg",
  open: "bg-[#B4262D] border-[#8A1C22] text-white cursor-default select-none",
  closed: "bg-[#FBE28E] border-[#D8B966] text-[#6E1C17] cursor-pointer transition-colors hover:bg-[#F7D877] focus-visible:outline-2 focus-visible:outline-[#B4262D]",
};

// The Install button beside the tabs (Stitch look): a small beige box with a thin brown edge: icon + word
export const KAREN_INSTALL = {
  button: "h-7 pl-2 pr-3 rounded-md flex items-center gap-1 text-sm font-bold cursor-pointer border border-[#78350F]/30 bg-[#EBD9BC] text-[#292524] transition-colors hover:bg-[#CFB794] active:bg-[#BFA47E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4262D]",
  hint: "absolute right-0 top-full mt-2 z-30 w-56 rounded-md border border-[#78350F]/30 bg-[#EBD9BC] px-3 py-2 text-sm text-[#3B2A14] shadow-lg",
};

// The hanging title sign: its ropes start at the top edge of the scene, centered (Introduction only; hidden on phones)
export const KAREN_BANNER = "absolute top-0 left-1/2 -translate-x-1/2 hidden sm:block w-[300px] h-[88px] [@media(max-height:600px)]:w-[200px] [@media(max-height:600px)]:h-[59px] pointer-events-none";

// The page behind everything under the scene: light cream, with the rice-field strip along the bottom
export const KAREN_PAGE = {
  bg: "bg-[#F5F9F3]",
  stickyBg: "max-lg:bg-[#F5F9F3]",
  strip: "absolute inset-x-0 bottom-0 -z-10 h-[112px] w-full max-w-none pointer-events-none",
};

// Dark wood (Stitch look): light brown at the top to dark brown at the bottom, gold edge, light-gold text
const WOOD = "border-2 border-[#D97706]/40 bg-[linear-gradient(180deg,#6C4122_0%,#4B2B13_50%,#341C0C_100%)] text-[#FDE68A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_3px_6px_rgba(0,0,0,0.35)]";
// Mouse on it: brighter and a little bigger. Pressed: a little smaller. "Reduce motion": no animation.
const PRESSABLE = "transition motion-reduce:transition-none enabled:hover:brightness-125 enabled:hover:scale-108 enabled:active:scale-95";

// The bottom bar (Stitch look): a woven mat behind dark wood buttons with gold text; Reset All is solid red
export const KAREN_BAR = {
  box: "relative isolate w-full max-w-[800px] lg:max-w-[1000px] xl:max-w-[1150px] flex flex-wrap items-center justify-between gap-x-2 sm:gap-x-6 gap-y-2 px-3 sm:px-9 py-[18px] [@media(max-height:600px)]:py-[10px]",
  // Charts tab, laptops: tighter side padding and gaps, so all the buttons fit in one row from 1024px wide
  compact: "lg:px-4 lg:gap-x-3",
  mat: "absolute inset-0 -z-10 h-full w-full max-w-none pointer-events-none", // behind the buttons, whatever their order
  word: "my-1 h-10 px-3 sm:px-4 rounded-full flex items-center gap-2 text-sm font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
  clear: `${WOOD} ${PRESSABLE}`, // Clear Data and Formula
  reset: `border-2 border-[#F59E0B]/50 bg-[#B4262D] text-[#FEF3C7] shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_3px_6px_rgba(0,0,0,0.35)] ${PRESSABLE}`,
  round: `w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center cursor-pointer ${WOOD} ${PRESSABLE} disabled:opacity-40 disabled:cursor-not-allowed`,
  modeBox: `flex gap-1 p-1 rounded-full ${WOOD}`,
  modeOn: "bg-[#B4262D] text-[#FEF3C7]",
  modeOff: "text-[#FDE68A]",
  drum: "relative w-[108px] h-[82px] -my-[17px] shrink-0 cursor-pointer transition hover:brightness-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4262D]",
};

// The time box (Stitch look): a beige box with a brown edge in the scene's top corner, dark text
export const KAREN_TIME = "absolute top-2 left-2 lg:left-auto lg:right-2 z-10 h-9 min-w-[96px] px-3 flex items-center justify-center rounded-md border-2 border-[#82542A] bg-[#EBD9BC] shadow-sm font-mono text-xl font-bold text-[#1C1917]";

// The number box (Stitch look), on every screen and both tabs: beige, thin brown edge,
// number + unit inside. The digits stay 16px, so iPhones don't zoom in.
export const KAREN_NUMBER = {
  box: "flex items-center gap-1 whitespace-nowrap h-7 sm:h-8 px-2 rounded-md border border-[#78350F]/40 bg-[#EBE1CE] shadow-inner focus-within:ring-2 focus-within:ring-[#78350F]/40",
  number: "w-[42px] sm:w-[46px] bg-transparent text-right font-mono text-base font-bold text-[#1C1917] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
  unit: "text-xs sm:text-sm font-bold",
};

// The Intro tab's 3 sliders. Phones (Stitch look): one line each, and the 3 lines share
// columns so the bars line up: ● name (x) | -10 | bar | +10 | number box.
// Tablets and laptops: name + box, the bar under them, -10 / 10 under its ends.
const INPUT_END = "font-mono text-[10px] font-semibold text-stone-600 sm:font-sans sm:text-sm sm:font-normal sm:leading-none sm:text-gray-600 sm:row-start-3"; // -10 and +10
export const KAREN_INPUT = {
  // Phones: one grid with 5 columns. sm and up: side by side, as before.
  area: "shrink-0 grid grid-cols-[max-content_max-content_1fr_max-content_max-content] items-center gap-x-1.5 gap-y-2.5 px-4 py-3 sm:flex sm:flex-row sm:gap-2 sm:px-[72px] sm:py-2",
  // One value. Phones: one line using the area's columns. sm and up: 2 columns, 3 lines.
  row: "col-span-5 grid grid-cols-subgrid items-center sm:flex-1 sm:min-w-0 sm:grid-cols-[1fr_auto] sm:gap-2 sm:p-3",
  name: "flex items-center gap-1.5 whitespace-nowrap text-[13px] font-bold sm:text-base sm:col-start-1 sm:row-start-1",
  dot: "size-2.5 shrink-0 rounded-full border border-[#451A03] sm:hidden", // phones only
  symbol: "text-[11px] text-stone-700 sm:hidden", // (x) (v) (a): phones only
  min: `${INPUT_END} sm:col-start-1`,
  max: `${INPUT_END} sm:col-start-2 sm:justify-self-end`,
  slider: "sm:col-span-2 sm:row-start-2",
  box: "sm:col-start-2 sm:row-start-1 sm:justify-self-end", // only where the box sits; its look is KAREN_NUMBER
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
