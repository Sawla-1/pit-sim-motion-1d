// Small curves where the mint "bite" meets the scene: mint outside a 14px circle
const curve = "absolute w-3.5 h-3.5";
const curveLeft = `${curve} top-0 -left-3.5 bg-[radial-gradient(circle_at_0_100%,transparent_13.5px,#C9EEEA_14px)]`;
const curveRight = `${curve} top-0 -right-3.5 bg-[radial-gradient(circle_at_100%_100%,transparent_13.5px,#C9EEEA_14px)]`;
const curveBelow = `${curve} top-full left-0 bg-[radial-gradient(circle_at_100%_100%,transparent_13.5px,#C9EEEA_14px)]`;

// Tab row in the scene's top-left corner, above everything in the scene.
// The open tab is just its name (the scene is the tab), with a white glow so
// it stays readable over the man. Each other tab is a dark button in a mint
// bite cut out of the scene's top edge, a bit see-through so the man shows behind it.
function Tabs({ tabs, selected, onSelect }) {
  return (
    <div className="absolute top-0 left-0 z-20 flex items-start">
      {tabs.map(({ id, label }, index) =>
        id === selected ? (
          <span
            key={id}
            aria-current="page"
            className="h-9 px-[18px] flex items-center text-sm font-bold text-blue-900 [text-shadow:0_0_3px_#fff,0_0_6px_#fff]"
          >
            {label}
          </span>
        ) : (
          // First tab touches the scene's left edge: no left curve, the scene's corner curves in under it
          <div key={id} className={`relative pt-1 pr-1.5 pb-1.5 bg-[#C9EEEA] opacity-80 ${index === 0 ? "pl-1 rounded-br-[14px]" : "pl-1.5 rounded-b-[14px]"}`}>
            <span aria-hidden="true" className={index === 0 ? curveBelow : curveLeft} />
            <button
              onClick={() => onSelect(id)}
              className="h-7 px-3.5 rounded-[10px] bg-[#1f2437] text-sm font-bold text-slate-300 cursor-pointer transition-colors hover:text-white"
            >
              {label}
            </button>
            <span aria-hidden="true" className={curveRight} />
          </div>
        )
      )}
    </div>
  );
}

export default Tabs;
