// Tab row above the scene, like folder tabs. The open tab is orange and the other tabs are
// light orange (the logo colours). They touch the scene.
// Each tab is as big as its text plus a little padding.
// Phones/tablets: a row above the scene. Laptops: the tabs float on the scene's top-left
// corner, so they use no height.
function Tabs({ tabs, selected, onSelect }) {
  return (
    <div className="flex items-end lg:absolute lg:top-0 lg:left-0 lg:z-20">
      {tabs.map(({ id, label }) =>
        id === selected ? (
          <span
            key={id}
            aria-current="page"
            className="px-2 py-1 rounded-t bg-[#F4844B] text-sm font-bold text-[#3b0d12] cursor-default select-none"
          >
            {label}
          </span>
        ) : (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className="px-2 py-1 rounded-t bg-[#FDDDCB] text-sm font-bold text-[#7A1520] cursor-pointer transition-colors hover:bg-[#FBCBB0]"
          >
            {label}
          </button>
        )
      )}
    </div>
  );
}

export default Tabs;
