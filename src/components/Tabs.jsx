// Tab buttons at the top: the open one is dark like the toolbar
function Tabs({ tabs, selected, onSelect }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-white/70 shadow-sm">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          aria-pressed={selected === id}
          onClick={() => onSelect(id)}
          className={`px-3 h-7 rounded-lg text-sm font-bold cursor-pointer transition-colors ${
            selected === id ? "bg-[#1f2437] text-white" : "bg-white/60 text-slate-700 hover:bg-white"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default Tabs;
