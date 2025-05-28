import { Background, Core, Icons, Theme } from '@mb3r/component-library'
import { useEffect, useRef, useState } from 'react'

import * as apiUtil from './../util/api'
import * as auth from './../util/auth'
import * as storage from './../util/storage'
import SidePanelMoreMenu, { useSidePanelMoreMenu } from './SidePanelMoreMenu'

export const SidePanel = ({ type }: { type: 'sidepanel' | 'popup' }) => {
  const [refreshHash, setRefreshHash] = useState(0)
  const [pageTitle, setPageTitle] = useState<string | undefined>(undefined)
  const [pageLink, setPageLink] = useState<string | undefined>(undefined)
  const [pageReadingTime, setPageReadingTime] = useState<string | undefined>(undefined)
  const [tagString, setTagString] = useState<string | undefined>(undefined)
  const [error, setError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const moreMenu = useSidePanelMoreMenu()
  const [author, setAuthor] = useState<string>('')
  const [read, setRead] = useState(false)
  const [notes, setNotes] = useState<string>('')
  const [isQuote, setIsQuote] = useState(false)
  const [isTil, setIsTil] = useState(false)
  const [quoteProcessed, setQuoteProcessed] = useState(false)
  const [snapshot, setSnapshot] = useState<string>('')
  const [snapshotExpanded, setSnapshotExpanded] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [apiFieldMappings, setApiFieldMappings] = useState<apiUtil.ApiFieldMappings>(
    apiUtil.defaultApiFieldMappings,
  )

  const fetchPageMetadata = (tabId: number) => {
    chrome.tabs.sendMessage(tabId, { action: 'getUrl' }, (response) => {
      if (response && response.data) {
        setPageLink(response.data)
      } else {
        setPageLink(undefined)
      }
    })

    chrome.tabs.sendMessage(tabId, { action: 'getAuthor' }, (response) => {
      if (response && response.data) {
        setAuthor(response.data)
      } else {
        setAuthor('')
      }
    })

    chrome.tabs.sendMessage(tabId, { action: 'getReadTime' }, (response) => {
      if (response && response.data && isNaN(Number(response.data)) === false) {
        setPageReadingTime(response.data.toString())
      } else {
        setPageReadingTime(undefined)
      }
    })

    chrome.tabs.sendMessage(tabId, { action: 'getSnapshot' }, (response) => {
      if (response && response.data) {
        setSnapshot(response.data)
      } else {
        setSnapshot('')
      }
    })
  }

  useEffect(() => {
    auth.getAuthTokens()
  }, [])

  useEffect(() => {
    storage.getKey('apiFieldMappings').then((mappings) => {
      if (mappings) {
        setApiFieldMappings(mappings as apiUtil.ApiFieldMappings)
      } else {
        setApiFieldMappings(apiUtil.defaultApiFieldMappings)
      }
    })
    chrome.storage.local.get(['pendingQuote'], (result) => {
      if (result.pendingQuote) {
        const formattedQuote = `> ${result.pendingQuote}\n\n`
        setNotes((prevNotes) => prevNotes + formattedQuote)
        setIsQuote(true)
        setPageTitle(result.pendingQuote.slice(0, 75) + '...')
        setQuoteProcessed(true)

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0].id === undefined) {
            return
          }
          fetchPageMetadata(tabs[0].id)
        })

        chrome.storage.local.remove(['pendingQuote'])
      }

      if (!result.pendingQuote) {
        fetchPageInfo()
      }
    })
  }, [])

  useEffect(() => {
    if (refreshHash > 0 && !quoteProcessed) {
      fetchPageInfo()
    }
  }, [refreshHash, quoteProcessed])

  useEffect(() => {
    if (hasSubmitted || error) {
      scrollContainerRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [hasSubmitted, error])

  const handleCheckboxChange = (type: 'read' | 'quote' | 'til', checked: boolean) => {
    setRead(false)
    setIsQuote(false)
    setIsTil(false)

    if (checked) {
      switch (type) {
        case 'read':
          setRead(true)
          break
        case 'quote':
          setIsQuote(true)
          break
        case 'til':
          setIsTil(true)
          break
      }
    }
  }

  const fetchPageInfo = () => {
    setError(false)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id === undefined) {
        return
      }

      if (!quoteProcessed) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getTitle' }, (response) => {
          if (response && response.data) {
            setPageTitle(response.data)
          } else {
            setPageTitle(undefined)
          }
        })

        fetchPageMetadata(tabs[0].id)
      }
    })
  }

  const handleRefresh = () => {
    if (!quoteProcessed) {
      fetchPageInfo()
    }
    setRefreshHash(refreshHash + 1)
  }

  const onSubmit = () => {
    setHasSubmitted(false)
    setErrorMessage(undefined)

    if (pageLink === undefined || pageTitle === undefined) {
      setErrorMessage('Title and link are required')
      return setError(true)
    } else {
      setError(false)
    }

    let estimatedTime: number | undefined = undefined
    if (pageReadingTime !== undefined && isNaN(Number(pageReadingTime)) === false) {
      estimatedTime = Number(pageReadingTime)
    }

    Promise.all([storage.getKey('readingsApiToken'), storage.getKey('readingsApi')])
      .then(([token, apiUrl]) => {
        if (!token || !apiUrl) {
          console.error('API token or URL not configured')
          setErrorMessage('Missing API configuration. Please check settings.')
          setError(true)
          return Promise.reject(new Error('Missing API configuration. Please check settings.'))
        }

        const requestBody: { [key: string]: any } = {}
        requestBody[apiFieldMappings.title] = pageTitle
        requestBody[apiFieldMappings.link] = pageLink
        requestBody[apiFieldMappings.author] = author
        if (estimatedTime !== undefined && !isTil && !isQuote) {
          requestBody[apiFieldMappings.estimated_time] = estimatedTime
        }
        requestBody[apiFieldMappings.is_quote] = isQuote
        requestBody[apiFieldMappings.is_til] = isTil
        requestBody[apiFieldMappings.tags] = tagString
          ? tagString.split(',').map((tag) => tag.trim())
          : []
        requestBody[apiFieldMappings.read] = read
        requestBody[apiFieldMappings.notes] = notes
        requestBody[apiFieldMappings.snapshot] = snapshot

        return fetch(apiUrl as string, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        })
      })
      .then((response) => {
        if (!response || !response.ok) {
          const errorMsg = `Failed to submit page: ${response ? response.status : 'network error'}`
          setErrorMessage(errorMsg)
          throw new Error(errorMsg)
        }

        setHasSubmitted(true)
      })
      .catch((error) => {
        console.error('Submission error:', error)
        if (!errorMessage) {
          setErrorMessage('Network error submitting page')
        }
        setError(true)
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

          <main style={{ marginLeft: 8, marginRight: 8, marginBottom: 16 }}>
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
                right: 24,
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
                ml: 1,
                mt: 4,
                p: 2,
                mr: 2,
                position: 'relative',
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
                {isQuote ? 'Add Quote' : isTil ? 'Today I Learned...' : 'Bookmark'}
              </Core.Typography>
              <Core.Button
                variant="outlined"
                size="small"
                onClick={handleRefresh}
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
                    size="small"
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
                    size="small"
                  />
                </Core.Grid>
                <Core.Grid xs={12} item>
                  <Core.TextField
                    value={author}
                    label="Author"
                    variant="outlined"
                    placeholder="Author of the content"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setAuthor(event.target.value)
                    }
                    fullWidth
                    size="small"
                  />
                </Core.Grid>
                {!isQuote && !isTil && (
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
                      size="small"
                    />
                  </Core.Grid>
                )}
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
                    size="small"
                  />
                </Core.Grid>
                {!isQuote && !isTil && snapshot && (
                  <Core.Grid xs={12} item>
                    <Core.Box
                      sx={{ border: '1px solid #333', borderRadius: 1, overflow: 'hidden' }}
                    >
                      <Core.Button
                        variant="text"
                        onClick={() => setSnapshotExpanded(!snapshotExpanded)}
                        sx={{
                          width: '100%',
                          justifyContent: 'space-between',
                          textTransform: 'none',
                          p: 2,
                          bgcolor: '#1a1a1a',
                          color: '#fff',
                          '&:hover': {
                            bgcolor: '#2a2a2a',
                          },
                        }}
                        endIcon={
                          snapshotExpanded ? <Icons.KeyboardArrowUp /> : <Icons.KeyboardArrowDown />
                        }
                      >
                        Page Snapshot
                      </Core.Button>
                      <Core.Collapse in={snapshotExpanded}>
                        <Core.Box sx={{ p: 2, bgcolor: '#0a0a0a' }}>
                          <Core.TextField
                            value={snapshot}
                            label="Snapshot (Beta)"
                            variant="outlined"
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                              setSnapshot(event.target.value)
                            }
                            multiline
                            rows={10}
                            fullWidth
                            sx={{
                              '& .MuiInputBase-input': {
                                fontSize: '0.875rem',
                                fontFamily: 'monospace',
                              },
                            }}
                          />
                        </Core.Box>
                      </Core.Collapse>
                    </Core.Box>
                  </Core.Grid>
                )}
                <Core.Grid xs={12} item>
                  <Core.TextField
                    value={notes}
                    label={isQuote ? 'Quote' : 'Notes'}
                    variant="outlined"
                    placeholder={
                      isQuote
                        ? 'Enter the quote from this reading'
                        : 'Add your notes about this reading'
                    }
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setNotes(event.target.value)
                    }
                    multiline
                    rows={3}
                    fullWidth
                  />
                </Core.Grid>
                <Core.Grid xs={12} item>
                  <Core.Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Core.FormControlLabel
                      control={
                        <Core.Checkbox
                          checked={read}
                          onChange={(e) => handleCheckboxChange('read', e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Has read"
                    />
                    <Core.Box sx={{ mx: 1 }}></Core.Box>
                    <Core.FormControlLabel
                      control={
                        <Core.Checkbox
                          checked={isQuote}
                          onChange={(e) => handleCheckboxChange('quote', e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Is Quote"
                    />
                    <Core.Box sx={{ mx: 1 }}></Core.Box>
                    <Core.FormControlLabel
                      control={
                        <Core.Checkbox
                          checked={isTil}
                          onChange={(e) => handleCheckboxChange('til', e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Is TIL"
                    />
                  </Core.Box>
                </Core.Grid>
                <Core.Grid xs={12} item sx={{ mt: 1 }}>
                  <Core.Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="small"
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
              <Core.Grid xs={12} item sx={{ m: 3 }}>
                <Core.Alert
                  ref={scrollContainerRef}
                  variant="outlined"
                  severity="error"
                  color="error"
                  sx={{ bgcolor: '#f4433640', borderColor: '#f44336', mt: 1 }}
                >
                  {errorMessage || 'Oops, something went wrong.'}
                </Core.Alert>
              </Core.Grid>
            )}

            {hasSubmitted && (
              <Core.Grid xs={12} item sx={{ m: 3 }}>
                <Core.Alert
                  ref={scrollContainerRef}
                  variant="outlined"
                  severity="success"
                  color="success"
                  sx={{ bgcolor: '#3cf43640', borderColor: '#3cf436', mt: 1 }}
                >
                  {isQuote
                    ? 'Quote added to your reading list.'
                    : 'Page bookmarked for reading later.'}
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
