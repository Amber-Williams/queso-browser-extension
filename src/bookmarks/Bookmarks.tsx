import { Background, Core, Icons, Theme } from '@mb3r/component-library'
import { useEffect, useState } from 'react'

import * as apiUtil from '../util/api'
import * as auth from '../util/auth'
import * as storage from '../util/storage'

interface BookmarkItem {
  id: string
  [key: string]: any
}

interface ApiResponse {
  data: BookmarkItem[]
  meta?: {
    total_count: number
    filter_count: number
  }
}

export const BookmarksPage = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('date_created')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const [apiFieldMappings, setApiFieldMappings] = useState<apiUtil.ApiFieldMappings>(
    apiUtil.defaultApiFieldMappings,
  )

  const itemsPerPage = 5

  useEffect(() => {
    auth.getAuthTokens()
  }, [])

  useEffect(() => {
    storage.getKey('apiFieldMappings').then((mappings) => {
      if (mappings) {
        setApiFieldMappings(mappings as apiUtil.ApiFieldMappings)
      }
    })
  }, [])

  useEffect(() => {
    fetchBookmarks()
  }, [currentPage, searchQuery, sortBy, sortOrder, apiFieldMappings])

  const fetchBookmarks = async () => {
    setLoading(true)
    setError(false)
    setErrorMessage(undefined)

    try {
      const [token, apiUrl] = await Promise.all([
        storage.getKey('readingsApiToken'),
        storage.getKey('readingsApi'),
      ])

      if (!token || !apiUrl) {
        setError(true)
        setErrorMessage('API configuration missing. Please check your settings.')
        setLoading(false)
        return
      }

      const sortParam = sortOrder === 'desc' ? `-${sortBy}` : sortBy

      const fieldsToFetch = [
        apiFieldMappings.link,
        apiFieldMappings.read,
        apiFieldMappings.title,
        apiFieldMappings.date_created,
        apiFieldMappings.tags,
        apiFieldMappings.author,
        apiFieldMappings.id,
      ]

      const fieldsQuery = fieldsToFetch
        .map((field) => `fields[]=${encodeURIComponent(field)}`)
        .join('&')

      let queryString = `limit=${itemsPerPage}&page=${currentPage}&${fieldsQuery}&sort[]=${encodeURIComponent(sortParam)}`

      if (searchQuery.trim()) {
        queryString += `&search=${encodeURIComponent(searchQuery.trim())}`
      }

      const response = await fetch(`${apiUrl}?${queryString}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const countResponse = await fetch(`${apiUrl}?aggregate[countDistinct]=id`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!countResponse.ok) {
        throw new Error(`API request failed: ${countResponse.status} ${countResponse.statusText}`)
      }

      const countData = await countResponse.json()

      const data: ApiResponse = await response.json()
      setBookmarks(data?.data || [])
      setTotalCount(countData?.data?.[0]?.countDistinct?.id || 0)
    } catch (err) {
      console.error('Error fetching bookmarks:', err)
      setError(true)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch bookmarks')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setCurrentPage(1)
    fetchBookmarks()
  }

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    setCurrentPage(1)
    fetchBookmarks()
  }

  const openReadingLink = (item: BookmarkItem) => {
    const linkField = apiFieldMappings.link
    const link = item[linkField]
    if (link) {
      window.open(link, '_blank')
    }
  }

  const getDisplayValue = (item: BookmarkItem, field: keyof apiUtil.ApiFieldMappings) => {
    const mappedField = apiFieldMappings[field]
    return item[mappedField] || ''
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return dateString
    }
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)

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

          <main style={{ padding: '0 16px', margin: 'auto', maxWidth: '1000px' }}>
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
              MY READINGS ({totalCount})
            </Core.Typography>

            {/* Search and Controls */}
            <Core.Card
              elevation={1}
              sx={{
                mt: 2,
                p: 2,
                maxWidth: '1000px',
                margin: 'auto',
                mb: 2,
              }}
            >
              <Core.Grid container spacing={2} alignItems="center">
                <Core.Grid xs={12} md={6} item>
                  <form onSubmit={handleSearch}>
                    <Core.TextField
                      value={searchQuery}
                      label="Search bookmarks"
                      variant="outlined"
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        setSearchQuery(event.target.value)
                      }
                      fullWidth
                      size="small"
                      InputProps={{
                        endAdornment: (
                          <Core.IconButton type="submit" size="small">
                            <Icons.Search />
                          </Core.IconButton>
                        ),
                      }}
                    />
                  </form>
                </Core.Grid>
                <Core.Grid xs={6} md={3} item>
                  <Core.FormControl fullWidth size="small">
                    <Core.InputLabel>Sort by</Core.InputLabel>
                    <Core.Select
                      value={sortBy}
                      label="Sort by"
                      onChange={(event) => setSortBy(event.target.value)}
                    >
                      <Core.MenuItem value="date_created">Date Added</Core.MenuItem>
                      <Core.MenuItem value={apiFieldMappings.title}>Title</Core.MenuItem>
                      <Core.MenuItem value={apiFieldMappings.author}>Author</Core.MenuItem>
                      <Core.MenuItem value={apiFieldMappings.read}>Read Status</Core.MenuItem>
                    </Core.Select>
                  </Core.FormControl>
                </Core.Grid>
                <Core.Grid xs={6} md={2} item>
                  <Core.FormControl fullWidth size="small">
                    <Core.InputLabel>Order</Core.InputLabel>
                    <Core.Select
                      value={sortOrder}
                      label="Order"
                      onChange={(event) => setSortOrder(event.target.value as 'asc' | 'desc')}
                    >
                      <Core.MenuItem value="desc">Desc</Core.MenuItem>
                      <Core.MenuItem value="asc">Asc</Core.MenuItem>
                    </Core.Select>
                  </Core.FormControl>
                </Core.Grid>
                <Core.Grid xs={12} md={1} item>
                  <Core.IconButton onClick={handleRefresh} disabled={loading}>
                    <Icons.Refresh />
                  </Core.IconButton>
                </Core.Grid>
              </Core.Grid>
            </Core.Card>

            {/* Loading State */}
            {loading && (
              <Core.Card
                elevation={1}
                sx={{
                  mt: 2,
                  p: 4,
                  maxWidth: '1000px',
                  margin: 'auto',
                  textAlign: 'center',
                }}
              >
                <Core.CircularProgress />
                <Core.Typography sx={{ mt: 2, color: '#F8FAF6' }}>
                  Loading bookmarks...
                </Core.Typography>
              </Core.Card>
            )}

            {/* Error State */}
            {error && (
              <Core.Alert
                variant="outlined"
                severity="error"
                color="error"
                sx={{
                  bgcolor: '#f4433640',
                  borderColor: '#f44336',
                  mt: 3,
                  maxWidth: '1000px',
                  margin: '16px auto',
                }}
              >
                {errorMessage || 'Failed to load bookmarks.'}
              </Core.Alert>
            )}

            {/* Bookmarks List */}
            {!loading && !error && bookmarks.length > 0 && (
              <Core.Card
                elevation={1}
                sx={{
                  mt: 2,
                  maxWidth: '1000px',
                  margin: 'auto',
                }}
              >
                {bookmarks.map((item, index) => (
                  <div key={item.id || index}>
                    <Core.CardContent sx={{ p: 3 }}>
                      <Core.Grid container spacing={2} alignItems="center">
                        <Core.Grid xs={12} md={8} item>
                          <Core.Typography
                            variant="h6"
                            component="div"
                            sx={{
                              color: '#F8FAF6',
                              fontWeight: 500,
                              mb: 1,
                              cursor: 'pointer',
                              '&:hover': { color: '#4fc3f7' },
                            }}
                            onClick={() => openReadingLink(item)}
                          >
                            {getDisplayValue(item, 'title') || 'Untitled'}
                          </Core.Typography>

                          {getDisplayValue(item, 'author') && (
                            <Core.Typography variant="body2" sx={{ color: '#a0a0a0', mb: 1 }}>
                              by {getDisplayValue(item, 'author')}
                            </Core.Typography>
                          )}

                          <Core.Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                            {getDisplayValue(item, 'is_quote') && (
                              <Core.Chip
                                label="Quote"
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                            {getDisplayValue(item, 'is_til') && (
                              <Core.Chip
                                label="TIL"
                                size="small"
                                color="secondary"
                                variant="outlined"
                              />
                            )}
                            {getDisplayValue(item, 'read') ? (
                              <Core.Chip
                                label="Read"
                                size="small"
                                color="success"
                                variant="outlined"
                              />
                            ) : (
                              <Core.Chip
                                label="Unread"
                                size="small"
                                color="warning"
                                variant="outlined"
                              />
                            )}
                            {getDisplayValue(item, 'estimated_time') && (
                              <Core.Chip
                                label={`${getDisplayValue(item, 'estimated_time')} min`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Core.Box>

                          {Array.isArray(getDisplayValue(item, 'tags')) &&
                            getDisplayValue(item, 'tags').length > 0 && (
                              <Core.Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {(getDisplayValue(item, 'tags') as string[]).map(
                                  (tag: string, tagIndex: number) => (
                                    <Core.Chip
                                      key={tagIndex}
                                      label={tag}
                                      size="small"
                                      sx={{ fontSize: '0.7rem' }}
                                    />
                                  ),
                                )}
                              </Core.Box>
                            )}

                          {item.date_created && (
                            <Core.Typography
                              variant="caption"
                              sx={{ color: '#666', mt: 1, display: 'block' }}
                            >
                              Added {formatDate(item.date_created)}
                            </Core.Typography>
                          )}
                        </Core.Grid>

                        <Core.Grid
                          xs={12}
                          md={4}
                          item
                          sx={{ textAlign: { xs: 'left', md: 'right' } }}
                        >
                          <Core.Button
                            variant="contained"
                            color="primary"
                            onClick={() => openReadingLink(item)}
                            startIcon={<Icons.OpenInNew />}
                            sx={{ mb: { xs: 1, md: 0 }, mr: { xs: 0, md: 0 } }}
                          >
                            Open
                          </Core.Button>

                          {getDisplayValue(item, 'notes') && (
                            <Core.Tooltip title={getDisplayValue(item, 'notes')}>
                              <Core.IconButton sx={{ ml: 1 }}>
                                <Icons.Note />
                              </Core.IconButton>
                            </Core.Tooltip>
                          )}
                        </Core.Grid>
                      </Core.Grid>
                    </Core.CardContent>
                    {index < bookmarks.length - 1 && <Core.Divider />}
                  </div>
                ))}
              </Core.Card>
            )}

            {/* Empty State */}
            {!loading && !error && bookmarks.length === 0 && (
              <Core.Card
                elevation={1}
                sx={{
                  mt: 2,
                  p: 4,
                  maxWidth: '1000px',
                  margin: 'auto',
                  textAlign: 'center',
                }}
              >
                <Core.Typography variant="h6" sx={{ color: '#F8FAF6', mb: 2 }}>
                  No bookmarks found
                </Core.Typography>
                <Core.Typography sx={{ color: '#a0a0a0', mb: 2 }}>
                  {searchQuery
                    ? `No bookmarks match your search for "${searchQuery}"`
                    : 'Start by adding some bookmarks using the extension popup or sidebar.'}
                </Core.Typography>
                {searchQuery && (
                  <Core.Button
                    variant="outlined"
                    onClick={() => {
                      setSearchQuery('')
                      setCurrentPage(1)
                    }}
                  >
                    Clear Search
                  </Core.Button>
                )}
              </Core.Card>
            )}

            {/* Pagination */}
            {!loading && !error && totalPages > 1 && (
              <Core.Card
                elevation={1}
                sx={{
                  mt: 2,
                  p: 2,
                  maxWidth: '1000px',
                  margin: 'auto',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <Core.Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(event, value) => setCurrentPage(value)}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Core.Card>
            )}
          </main>
        </div>
      </>
    </Theme.Provider>
  )
}

export default BookmarksPage
