import { Background, Core, Theme } from '@mb3r/component-library'
import { useEffect, useState } from 'react'

import * as auth from './../util/auth'
import * as storage from './../util/storage'

export const Options = () => {
  const [apiToken, setApiToken] = useState<string | undefined>()
  const [apiLink, setApiLink] = useState<string | undefined>()
  const [readingUI, setReadingsUi] = useState<string | undefined>()
  const [error, setError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    auth.getAuthTokens()
  }, [])

  useEffect(() => {
    storage.getKey('readingsUi').then((token) => {
      if (token) {
        setReadingsUi(token as string)
      }
    })
    storage.getKey('readingsApiToken').then((token) => {
      if (token) {
        setApiToken(token as string)
      }
    })
    storage.getKey('readingsApi').then((link) => {
      if (link) {
        setApiLink(link as string)
      }
    })
  }, [])

  const onSave = () => {
    // Reset status messages
    setError(false)
    setErrorMessage(undefined)
    setSaveSuccess(false)

    // Validate inputs
    if (!apiToken || apiToken.trim() === '') {
      setError(true)
      setErrorMessage('API Token is required')
      return
    }

    if (!apiLink || apiLink.trim() === '') {
      setError(true)
      setErrorMessage('API URL is required')
      return
    }

    if (!readingUI || readingUI.trim() === '') {
      setError(true)
      setErrorMessage('Readings UI URL is required')
      return
    }

    // Validate URL formats
    try {
      new URL(apiLink)
      new URL(readingUI)
    } catch (e) {
      setError(true)
      setErrorMessage('Please enter valid URLs')
      return
    }

    // Save to storage
    Promise.all([
      storage.saveKey('readingsApiToken', apiToken),
      storage.saveKey('readingsApi', apiLink),
      storage.saveKey('readingsUi', readingUI),
    ])
      .then(() => {
        setSaveSuccess(true)
      })
      .catch((err) => {
        console.error('Error saving options:', err)
        setError(true)
        setErrorMessage('Failed to save settings')
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
          }}
        >
          <Background.Surface>
            <Background.ContourMapSVG size={1000} />
          </Background.Surface>

          <main style={{ padding: '0 16px', margin: 'auto', maxWidth: '600px' }}>
            <Core.Typography
              variant="h6"
              component="div"
              sx={{
                flexGrow: 1,
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.3rem',
                color: '#F8FAF6',
                textDecoration: 'none',
                pt: 4,
                pb: 2,
              }}
            >
              QUESO SETTINGS
            </Core.Typography>

            <Core.Card
              elevation={1}
              sx={{
                mt: 4,
                p: 2,
                maxWidth: '600px',
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
                API Configuration
              </Core.Typography>
              <Core.Grid container spacing={2}>
                <Core.Grid xs={12} item>
                  <Core.TextField
                    value={apiToken}
                    label="API Token"
                    variant="outlined"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setApiToken(event.target.value)
                    }
                    fullWidth
                  />
                </Core.Grid>
                <Core.Grid xs={12} item>
                  <Core.TextField
                    value={apiLink}
                    label="API URL"
                    variant="outlined"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setApiLink(event.target.value)}
                    fullWidth
                  />
                </Core.Grid>
                <Core.Grid xs={12} item>
                  <Core.TextField
                    value={readingUI}
                    label="Readings UI URL"
                    variant="outlined"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setReadingsUi(event.target.value)
                    }
                    fullWidth
                  />
                </Core.Grid>

                <Core.Grid xs={12} item>
                  <Core.Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    onClick={onSave}
                    sx={{ mt: 2 }}
                  >
                    Save
                  </Core.Button>
                </Core.Grid>
              </Core.Grid>
            </Core.Card>

            {error && (
              <Core.Alert
                variant="outlined"
                severity="error"
                color="error"
                sx={{ bgcolor: '#f4433640', borderColor: '#f44336', mt: 3, maxWidth: '600px', margin: '16px auto' }}
              >
                {errorMessage || "Oops, something went wrong."}
              </Core.Alert>
            )}

            {saveSuccess && (
              <Core.Alert
                variant="outlined"
                severity="success"
                color="success"
                sx={{ bgcolor: '#3cf43640', borderColor: '#3cf436', mt: 3, maxWidth: '600px', margin: '16px auto' }}
              >
                Settings saved successfully.
              </Core.Alert>
            )}
          </main>
        </div>
      </>
    </Theme.Provider>
  )
}

export default Options
