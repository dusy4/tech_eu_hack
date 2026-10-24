import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./tailwind.css";
import "./styles.css";
import "./workbench.css";
import "./answer.css";
import { MotionConfig } from "motion/react";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* One switch: under reduced motion, every motion component keeps its fades and drops its movement. */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
