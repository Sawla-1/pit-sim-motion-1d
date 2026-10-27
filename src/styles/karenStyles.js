// Karen look: the art files, and the ruler as thick bamboo that can be read on the meadow.
const ART = "/karen-intro-svgs";

export const KAREN_ART = {
  scene: `${ART}/scene-intro.svg`,
  bambooLeft: `${ART}/bamboo-left.svg`,
  bambooRight: `${ART}/bamboo-right.svg`,
  timeBackground: `${ART}/time-background.svg`,
  barBackground: `${ART}/bar-background-tall.svg`, // a copy of bar-background.svg whose height stretches (one or two rows of buttons)
  drum: `${ART}/drum-horns-empty.svg`, // the drum without its ▶: our Play/Pause icon goes on top
  tabBackground: `${ART}/tab-background-short.svg`, // a shorter copy of tab-background.svg (37px tall, the strip is 32px)
};

// The two view tabs: a woven mat behind them; the open tab is red
export const KAREN_TAB = {
  base: "relative h-[32px] px-4 flex items-center text-sm font-bold last:rounded-br-xl",
  open: "bg-[#B4262D] text-white cursor-default select-none",
  closed: "text-[#4A2A12] cursor-pointer transition-colors hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-[#B4262D]",
};

// The bottom bar: a woven mat behind white buttons with a brown ring (Reset All: red ring)
export const KAREN_BAR = {
  box: "relative w-full max-w-[800px] lg:max-w-[880px] xl:max-w-[1000px] flex flex-wrap items-center justify-between gap-x-2 sm:gap-x-6 gap-y-2 px-9 py-[18px]",
  mat: "absolute inset-0 h-full w-full max-w-none pointer-events-none",
  word: "h-10 px-4 rounded-full flex items-center gap-2 text-sm font-bold cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
  clear: "border-[3px] border-[#8A6A2F] bg-white text-[#3B2A14] enabled:hover:bg-[#F6EBD2]",
  reset: "border-2 border-[#B4262D] bg-white text-[#B4262D] enabled:hover:bg-[#FBE9EA]",
  round: "w-10 h-10 rounded-full flex items-center justify-center cursor-pointer border-[3px] border-[#8A6A2F] bg-white text-[#3B2A14] transition-colors enabled:hover:bg-[#F6EBD2] enabled:active:bg-[#EADBB5] disabled:opacity-40 disabled:cursor-not-allowed",
  modeBox: "flex gap-1 p-1 rounded-full border-[3px] border-[#8A6A2F] bg-white",
  modeOn: "bg-[#B4262D] text-white",
  modeOff: "text-[#3B2A14]",
  drum: "relative w-[108px] h-[82px] -my-[17px] shrink-0 cursor-pointer transition hover:brightness-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4262D]",
};

// The time box: a woven mat in the scene's top corner, with dark text
export const KAREN_TIME = {
  box: "absolute top-0 left-0 lg:left-auto lg:right-0 z-10 h-[56px] min-w-[132px]",
  mat: "absolute inset-0 h-full w-full max-w-none -scale-x-100 lg:scale-x-100 pointer-events-none",
  text: "relative h-[51px] flex items-center justify-center px-4 font-mono text-2xl font-bold text-[#2A1608]",
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
