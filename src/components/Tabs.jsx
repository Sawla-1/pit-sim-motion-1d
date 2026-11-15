import { KAREN_ART, KAREN_TAB } from "../styles/karenStyles";

// The two view tabs on a woven mat. The open tab is red; the other shows the mat.
// Each tab is as big as its text plus padding.
// (Where the tabs sit on the page is decided by App.jsx: see KAREN_TAB.row.)
function Tabs({ tabs, selected, onSelect }) {
  return (
    <div className="relative flex">
      {/* The mat is a little wider than the tabs (room for its edge and shadow) */}
      <img
        src={KAREN_ART.tabBackground}
        alt=""
        aria-hidden="true"
        className="absolute top-0 left-0 h-[37px] w-[calc(100%+4px)] max-w-none pointer-events-none"
      />
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
