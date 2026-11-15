import { useState } from "react";
import { KAREN_INSTALL } from "../styles/karenStyles";

// A small round button that installs the page as an app (home-screen icon, works offline).
//   mode "prompt": a click opens the browser's own install box (onInstall)
//   mode "hint":   iPhone/iPad cannot do that, so a click shows how to do it by hand
//   mode "none":   nothing is drawn
function InstallButton({ mode, onInstall }) {
  // Only for the hint: is the little note open?
  const [hintOpen, setHintOpen] = useState(false);
  if (mode === "none") return null;

  return (
    <div className="relative">
      <button
        type="button"
        title="Install app"
        aria-label="Install app"
        aria-expanded={mode === "hint" ? hintOpen : undefined}
        onClick={mode === "prompt" ? onInstall : () => setHintOpen(!hintOpen)}
        className={KAREN_INSTALL.button}
      >
        {/* Arrow down into a tray: "download" */}
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 4v11" />
          <path d="M7 11l5 5 5-5" />
          <path d="M5 20h14" />
        </svg>
      </button>
      {mode === "hint" && hintOpen && (
        <p role="status" className={KAREN_INSTALL.hint}>
          To install: tap the <b>Share</b> button, then <b>Add to Home Screen</b>.
        </p>
      )}
    </div>
  );
}

export default InstallButton;
