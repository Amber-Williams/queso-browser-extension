import React from 'react'
import ReactDOM from 'react-dom/client'
import { SidePanel } from './../sidepanel/SidePanel'

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <div style={{ height: '600px', width: '350px' }}>
      <SidePanel type="popup" />
    </div>
  </React.StrictMode>,
)
