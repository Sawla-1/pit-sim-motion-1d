import { KAREN_TAB } from "../styles/karenStyles";

// The two view tabs. The open tab is red; the other is light yellow.
// Each tab is as big as its text plus padding.
// (Where the tabs sit on the page is decided by App.jsx: see KAREN_TAB.row.)
function Tabs({ tabs, selected, onSelect }) {
  return (
    <div className="flex gap-1.5">
      {tabs.map(({ id, label }) =>
        id === selected ? (
          <span key={id} aria-current="page" className={`${KAREN_TAB.base} ${KAREN_TAB.open}`}>
            {label}
          </span>
        ) : (
          <button key={id} onClick={() => onSelect(id)} className={`${KAREN_TAB.base} ${KAREN_TAB.closed}`}>
            {label}
          </button>
        )
      )}
    </div>
  );
}

export default Tabs;
