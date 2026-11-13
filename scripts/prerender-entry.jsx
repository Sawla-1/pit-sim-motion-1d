// Build-time only. Draws the app's first screen as an HTML string (see prerender.mjs).
import { renderToString } from "react-dom/server";
import App from "../src/App.jsx";

export const renderFirstScreen = () => renderToString(<App />);
