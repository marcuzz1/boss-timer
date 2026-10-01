import { createRoot } from "react-dom/client";
import { DesktopApp } from "./components/desktop/DesktopApp";
import "./styles/desktop.css";

const container = document.getElementById("root");
if (!container) throw new Error("找不到 #root，index.html 的結構被改掉了");

createRoot(container).render(<DesktopApp />);
