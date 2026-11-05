import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Admin from "./Admin.jsx";
import "./styles.css";

window.addEventListener("hashchange", () => location.reload());
const isAdmin = location.hash.startsWith("#/admin");
createRoot(document.getElementById("root")).render(isAdmin ? <Admin /> : <App />);
