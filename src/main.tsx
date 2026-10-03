import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OakRumble } from "./components/OakRumble.tsx";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OakRumble />
  </StrictMode>,
);
