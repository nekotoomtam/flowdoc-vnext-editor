import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { EditorApp } from "./app/EditorApp"
import "./styles/tokens.css"
import "./styles/app.css"
import "./styles/editor.css"

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("FlowDoc editor root element is missing.")
}

createRoot(rootElement).render(
  <StrictMode>
    <EditorApp />
  </StrictMode>,
)
