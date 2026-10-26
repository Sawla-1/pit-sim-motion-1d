// Small curves where the mint "bite" meets the scene: mint outside a 14px circle
const curve = "absolute w-3.5 h-3.5";
const curveRight = `${curve} top-0 -right-3.5 bg-[radial-gradient(circle_at_100%_100%,transparent_13.5px,#C9EEEA_14px)]`;
const curveBelow = `${curve} top-full left-0 bg-[radial-gradient(circle_at_100%_100%,transparent_13.5px,#C9EEEA_14px)]`;

// Tab row in the scene's top-left corner, above everything in the scene.
// All tabs sit in one mint bite cut out of the scene's top edge, a bit see-through
// so the man shows behind it. The open tab is a light pill, the others are dark buttons.
function Tabs({ tabs, selected, onSelect }) {
  return (
    <div className="absolute top-0 left-0 z-20">
      <div className="relative flex gap-1.5 pt-1 pl-1 pr-1.5 pb-1.5 bg-[#C9EEEA] opacity-80 rounded-br-[14px]">
        <span aria-hidden="true" className={curveBelow} />
        {tabs.map(({ id, label }) =>
          id === selected ? (
            <span
              key={id}
              aria-current="page"
              className="h-7 px-3.5 flex items-center rounded-[10px] bg-blue-50 text-sm font-bold text-blue-900 cursor-default select-none"
            >
              {label}
            </span>
          ) : (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className="h-7 px-3.5 rounded-[10px] bg-[#1f2437] text-sm font-bold text-slate-300 cursor-pointer transition-colors hover:text-white"
            >
              {label}
            </button>
          )
        )}
        <span aria-hidden="true" className={curveRight} />
      </div>
    </div>
  );
}

export default Tabs;
