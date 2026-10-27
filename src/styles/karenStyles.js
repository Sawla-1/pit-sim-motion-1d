// Karen look: the art files, and the ruler as thick bamboo that can be read on the meadow.
const ART = "/karen-intro-svgs";

export const KAREN_ART = {
  scene: `${ART}/scene-intro.svg`,
  bambooLeft: `${ART}/bamboo-left.svg`,
  bambooRight: `${ART}/bamboo-right.svg`,
  tabBackground: `${ART}/tab-background-short.svg`, // a shorter copy of tab-background.svg (37px tall, the strip is 32px)
};

// The two view tabs: a woven mat behind them; the open tab is red
export const KAREN_TAB = {
  base: "relative h-[32px] px-4 flex items-center text-sm font-bold last:rounded-br-xl",
  open: "bg-[#B4262D] text-white cursor-default select-none",
  closed: "text-[#4A2A12] cursor-pointer transition-colors hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-[#B4262D]",
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
