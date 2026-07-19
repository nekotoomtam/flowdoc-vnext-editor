import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { FlowDocApp } from "./app/FlowDocApp"
import "./styles/tokens.css"
import "./styles/app.css"
import "./styles/editor.css"
import "./styles/library.css"
import "./styles/workspace.css"

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("FlowDoc editor root element is missing.")
}

createRoot(rootElement).render(
  <StrictMode>
    <FlowDocApp />
  </StrictMode>,
)
