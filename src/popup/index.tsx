import React from 'react'
import ReactDOM from 'react-dom/client'
import { SidePanel } from './../sidepanel/SidePanel'

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <div style={{ minHeight: '780px', width: '400px', overflowY: 'auto' }}>
      <SidePanel type="popup" />
    </div>
  </React.StrictMode>,
)
