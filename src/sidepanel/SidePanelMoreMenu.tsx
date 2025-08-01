import { Core } from '@mb3r/component-library'
import { useState } from 'react'

import * as storage from './../util/storage'

export type SidePanelMoreMenuType = ReturnType<typeof useSidePanelMoreMenu>

export const useSidePanelMoreMenu = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | undefined>()

  return {
    anchorEl,
    setAnchorEl,
  }
}

const SidePanelMoreMenu = (props: SidePanelMoreMenuType) => {
  const open = Boolean(props.anchorEl)

  const handleClose = () => {
    props.setAnchorEl(undefined)
  }

  return (
    <Core.Menu
      anchorEl={props.anchorEl}
      open={open}
      onClose={handleClose}
      MenuListProps={{
        'aria-labelledby': 'basic-button',
      }}
    >
      <Core.MenuItem
        onClick={() => {
          chrome.tabs.create({ url: `chrome-extension://${chrome.runtime.id}/bookmarks.html` })
          handleClose()
        }}
      >
        Bookmarks
      </Core.MenuItem>
      <Core.MenuItem
        onClick={() => {
          chrome.tabs.create({ url: `chrome-extension://${chrome.runtime.id}/options.html` })
          handleClose()
        }}
      >
        Settings
      </Core.MenuItem>
    </Core.Menu>
  )
}

export default SidePanelMoreMenu
