import { createRoot } from "react-dom/client";
import { MobileApp } from "./components/mobile/MobileApp";
import "./styles/mobile.css";

const container = document.getElementById("root");
if (!container) throw new Error("找不到 #root，mobile.html 的結構被改掉了");

createRoot(container).render(<MobileApp />);
