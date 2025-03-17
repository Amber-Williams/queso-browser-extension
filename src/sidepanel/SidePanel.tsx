import { Background, Core, Icons, Theme } from '@mb3r/component-library'
import { useEffect, useState } from 'react'

import * as storage from './../util/storage'
import SidePanelMoreMenu, { useSidePanelMoreMenu } from './SidePanelMoreMenu'

export const SidePanel = ({ type }: { type: 'sidepanel' | 'popup' }) => {
  const [refreshHash, setRefreshHash] = useState(0)
  const [pageTitle, setPageTitle] = useState<string | undefined>(undefined)
  const [pageLink, setPageLink] = useState<string | undefined>(undefined)
  const [pageReadingTime, setPageReadingTime] = useState<string | undefined>(undefined)
  const [tagString, setTagString] = useState<string | undefined>(undefined)
  const [error, setError] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const moreMenu = useSidePanelMoreMenu()

  useEffect(() => {
    setError(false)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id === undefined) {
        return
      }

      chrome.tabs.sendMessage(tabs[0].id, { action: 'getH1Content' }, (response) => {
        if (response && response.h1Content) {
          setPageTitle(response.h1Content)
        } else {
          setPageTitle(undefined)
        }
      })

      chrome.tabs.sendMessage(tabs[0].id, { action: 'getCurrentUri' }, (response) => {
        if (response && response.h1Content) {
          setPageLink(response.h1Content)
        } else {
          setPageLink(undefined)
        }
      })
    })
  }, [refreshHash])

  const onSubmit = () => {
    setHasSubmitted(false)
    if (pageLink === undefined || pageTitle === undefined) {
      return setError(true)
    } else {
      setError(false)
    }

    let estimatedTime: number | undefined = undefined
    if (pageReadingTime !== undefined && isNaN(Number(pageReadingTime)) === false) {
      estimatedTime = Number(pageReadingTime)
    }

    storage.getKey('readingsApiToken').then((token) => {
      // TODO: handle if API variables aren't found & ugly callback logic

      storage.getKey('readingsApi').then((link) => {
        fetch(link as string, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: pageTitle,
            link: pageLink,
            estimated_time: estimatedTime,
            tags: tagString ? tagString.split(',').map((tag) => tag.trim()) : [],
          }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error('Failed to submit page')
            }

            setHasSubmitted(true)
          })
          .catch((error) => {
            console.error(error)
            setError(true)
          })
      })
    })
  }

  return (
    <Theme.Provider mode={'dark'}>
      <>
        <Core.CssBaseline />

        <div
          style={{
            height: '100%',
            minHeight: '100vh',
            width: '100vw',
            position: 'absolute',
            backgroundColor: '#0f1011',
            zIndex: 0,
            minWidth: type === 'popup' ? '300px' : undefined,
            maxWidth: type === 'popup' ? '600px' : undefined,
          }}
        >
          <Background.Surface>
            <Background.ContourMapSVG size={1000} />
          </Background.Surface>

          <main style={{ marginLeft: 8, marginRight: 8 }}>
            <Core.Typography
              variant="h6"
              component="div"
              sx={{
                flexGrow: 1,
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.1rem',
                color: '#F8FAF6',
                textDecoration: 'none',
                mx: 2,
                mt: 2,
                mb: 3,
                fontSize: '1rem',
              }}
            >
              QUESO
            </Core.Typography>
            <Core.Button
              variant="outlined"
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                moreMenu.setAnchorEl(event.currentTarget)
              }}
              sx={{
                position: 'absolute',
                top: 8,
                right: 16,
                p: 1,
                minWidth: '0',
                borderRadius: '50%',
                background: '#1f2022',
                borderColor: 'transparent',
              }}
              size="small"
              color="secondary"
              aria-controls={Boolean(moreMenu.anchorEl) ? 'basic-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={Boolean(moreMenu.anchorEl) ? 'true' : undefined}
            >
              <Icons.MoreVert />
            </Core.Button>
            <SidePanelMoreMenu {...moreMenu} />

            <Core.Card
              elevation={1}
              sx={{
                mt: 4,
                p: 2,
                position: 'relative',
                margin: 'auto',
              }}
            >
              <Core.Typography
                variant="h6"
                component="div"
                sx={{
                  flexGrow: 1,
                  fontFamily: 'monospace',
                  fontWeight: 300,
                  letterSpacing: '.1rem',
                  color: '#F8FAF6',
                  mb: 2,
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                }}
              >
                Bookmark for reading
              </Core.Typography>
              <Core.Button
                variant="outlined"
                onClick={() => setRefreshHash(refreshHash + 1)}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 16,
                }}
              >
                <Icons.Refresh />
              </Core.Button>
              <Core.Grid container spacing={2}>
                <Core.Grid xs={12} item>
                  <Core.TextField
                    value={pageLink}
                    label="Link"
                    variant="outlined"
                    placeholder="Paste the URL of the page here"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setPageLink(event.target.value)
                    }
                    fullWidth
                  />
                </Core.Grid>
                <Core.Grid xs={12} item>
                  <Core.TextField
                    value={pageTitle}
                    label="Title"
                    variant="outlined"
                    placeholder="Paste the title of the page here"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setPageTitle(event.target.value)
                    }
                    fullWidth
                  />
                </Core.Grid>

                <Core.Grid xs={12} item>
                  <Core.TextField
                    error={pageReadingTime?.match(/^[0-9]*$/g) === null}
                    value={pageReadingTime}
                    label="Estimated reading minutes"
                    variant="outlined"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setPageReadingTime(event.target.value)
                    }
                    fullWidth
                  />
                </Core.Grid>
                <Core.Grid xs={12} item>
                  <Core.TextField
                    value={tagString}
                    label="Tags"
                    variant="outlined"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setTagString(event.target.value)
                    }
                    helperText="Separate tags with commas"
                    fullWidth
                  />
                </Core.Grid>

                <Core.Grid xs={12} item sx={{ mt: 3 }}>
                  <Core.Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    onClick={onSubmit}
                    sx={{
                      position: 'absolute',
                      bottom: 16,
                      right: 16,
                    }}
                  >
                    Submit
                  </Core.Button>
                </Core.Grid>
              </Core.Grid>
            </Core.Card>
            {error && (
              <Core.Grid xs={12} item sx={{ mt: 3, mx: 3 }}>
                <Core.Alert
                  variant="outlined"
                  severity="error"
                  color="error"
                  sx={{ bgcolor: '#f4433640', borderColor: '#f44336', mt: 1 }}
                >
                  Oops, something went wrong.
                </Core.Alert>
              </Core.Grid>
            )}

            {hasSubmitted && (
              <Core.Grid xs={12} item sx={{ mt: 3, mx: 3 }}>
                <Core.Alert
                  variant="outlined"
                  severity="success"
                  color="success"
                  sx={{ bgcolor: '#3cf43640', borderColor: '#3cf436', mt: 1 }}
                >
                  Page bookmarked for reading later.
                </Core.Alert>
              </Core.Grid>
            )}
          </main>
        </div>
      </>
    </Theme.Provider>
  )
}

export default SidePanel
