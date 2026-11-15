// The "this page can be installed" signal from the browser. Not about any one simulation.
// Chrome, Edge and Samsung Internet send it. We keep it, so our own Install button
// can open the browser's install box later.
// iPhone and iPad send nothing: there the button can only show how to do it by hand.

let signal = null; // the browser's signal (an event), or null when there is none
let tellPage = () => {}; // called when the answer of installMode() may have changed

// Already running as the installed app? Then there is nothing to install.
const isInstalledApp = () =>
  window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

// iPhone or iPad. (A new iPad says it is a Mac, so also look for a touch screen.)
const isAppleTouchDevice = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// Runs once at page start (see main.jsx), before the app draws: the signal can come early.
export const startInstallPrompt = () => {
  window.addEventListener("beforeinstallprompt", (event) => {
    // No preventDefault(): the browser may still show its own install bar too
    signal = event;
    tellPage();
  });
  window.addEventListener("appinstalled", () => {
    signal = null;
    tellPage();
  });
};

// What the Install button should do right now:
//   "prompt" = open the browser's install box
//   "hint"   = iPhone/iPad: show how to install by hand
//   "none"   = no button (already installed, or this browser cannot install)
export const installMode = () => {
  if (isInstalledApp()) return "none";
  if (signal) return "prompt";
  return isAppleTouchDevice() ? "hint" : "none";
};

// The page asks to be told about changes. Returns the way to stop being told.
export const watchInstallMode = (callback) => {
  tellPage = callback;
  return () => {
    tellPage = () => {};
  };
};

// Opens the browser's install box. Must be called from a click.
export const openInstallBox = () => {
  if (!signal) return;
  const used = signal;
  // A signal works only once. If the user says no, the browser sends a new one.
  signal = null;
  tellPage();
  used.prompt();
};
