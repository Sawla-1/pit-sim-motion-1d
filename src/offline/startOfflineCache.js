// Runs once at page start (see main.jsx). Not about any one simulation.
// It turns on the service worker, which saves the page for use with no internet.
// Update rule: a new version downloads quietly and takes over in the background.
// The open page is never reloaded, it keeps running as it is. The next page
// start (fresh open or refresh) shows the new version.
export const startOfflineCache = () => {
  // No service worker in `npm run dev`, or in a browser that has none
  if (import.meta.env.DEV || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js");
};
