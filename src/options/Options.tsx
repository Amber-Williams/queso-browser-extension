import { Background, Core, Theme } from '@mb3r/component-library'
import { useEffect, useState } from 'react'

import * as storage from './../util/storage'

export const Options = () => {
  const [apiToken, setApiToken] = useState<string | undefined>(import.meta.env.VITE_API_TOKEN)
  const [apiLink, setApiLink] = useState<string | undefined>(import.meta.env.VITE_API_SERVER)

  useEffect(() => {
    if (import.meta.env.VITE_API_TOKEN && import.meta.env.VITE_API_SERVER) {
      // Useful to persist for development mode
      setApiToken(import.meta.env.VITE_API_TOKEN)
      setApiLink(import.meta.env.VITE_API_SERVER)
    } else {
      storage.getKey('apiToken').then((token) => {
        if (token) {
          setApiToken(token as string)
        }
      })
      storage.getKey('apiLink').then((link) => {
        if (link) {
          setApiLink(link as string)
        }
      })
    }
  }, [])

  const onSave = () => {
    storage.saveKey('apiToken', apiToken)
    storage.saveKey('apiLink', apiLink)
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
          }}
        >
          <Background.Surface>
            <Background.ContourMapSVG size={1000} />
          </Background.Surface>

          <main style={{ marginLeft: 16, marginRight: 16 }}>
            <Core.Typography
              variant="h6"
              component="div"
              sx={{
                flexGrow: 1,
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.2rem',
                color: '#F8FAF6',
                textDecoration: 'none',
                mx: 3,
                my: 4,
              }}
            >
              Settings Page
            </Core.Typography>

            <Core.Card
              elevation={1}
              sx={{
                mt: 4,
                p: 2,
                position: 'relative',
                margin: 'auto',
              }}
            >
              <Core.Grid container spacing={2}>
                <Core.Grid xs={12} item>
                  <Core.TextField
                    value={apiToken}
                    label="API server token"
                    variant="outlined"
                    fullWidth
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setApiToken(event.target.value)
                    }
                  />
                </Core.Grid>

                <Core.Grid xs={12} item>
                  <Core.TextField
                    value={apiLink}
                    label="API server link"
                    variant="outlined"
                    fullWidth
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setApiLink(event.target.value)
                    }
                  />
                </Core.Grid>
                <Core.Grid xs={12} item sx={{ mt: 5 }}>
                  <Core.Button
                    type="submit"
                    variant="outlined"
                    color="primary"
                    onClick={onSave}
                    sx={{
                      position: 'absolute',
                      bottom: 16,
                      right: 16,
                    }}
                  >
                    Update
                  </Core.Button>
                </Core.Grid>
              </Core.Grid>
            </Core.Card>
          </main>
        </div>
      </>
    </Theme.Provider>
  )
}

export default Options
