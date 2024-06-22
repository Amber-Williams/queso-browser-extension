import React from 'react'
import ReactDOM from 'react-dom/client'
import { SidePanel } from './SidePanel'

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <SidePanel type="sidepanel" />
  </React.StrictMode>,
)
