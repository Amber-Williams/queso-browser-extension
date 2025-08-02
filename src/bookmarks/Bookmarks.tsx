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
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagToItemsMap, setTagToItemsMap] = useState<Record<string, string[]>>({})
  const [statusFilter, setStatusFilter] = useState<string>('all')

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
  }, [currentPage, searchQuery, sortBy, sortOrder, selectedTags, apiFieldMappings, statusFilter])

  useEffect(() => {
    fetchCount()
  }, [apiFieldMappings, statusFilter])

  useEffect(() => {
    fetchAvailableTags()
  }, [apiFieldMappings])

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
        apiFieldMappings.id,
        apiFieldMappings.link,
        apiFieldMappings.read,
        apiFieldMappings.title,
        apiFieldMappings.date_created,
        apiFieldMappings.tags,
        apiFieldMappings.author,
        apiFieldMappings.estimated_time,
        apiFieldMappings.is_quote,
        apiFieldMappings.is_til,
      ]
      const fieldsQuery = fieldsToFetch
        .map((field) => `fields[]=${encodeURIComponent(field)}`)
        .join('&')
      let queryString = `limit=${itemsPerPage}&${fieldsQuery}&sort[]=${encodeURIComponent(sortParam)}`

      if (searchQuery.trim()) {
        queryString += `&search=${encodeURIComponent(searchQuery.trim())}`
      }

      if (selectedTags.length > 0) {
        const filteredItemIdsTotal = getItemIdsByTags(selectedTags)
        if (filteredItemIdsTotal.length === 0) {
          setBookmarks([])
          setLoading(false)
          return
        }

        // TODO: update this to include filter logic by status
        // There's a limit to the number of items that can be fetched via filter[_or]
        // so we fetch the page items only and mock the items for the pagination UI
        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        const filteredItemIds = filteredItemIdsTotal.slice(startIndex, endIndex)

        filteredItemIds.forEach((id, index) => {
          queryString += `&filter[_or][${index}][${apiFieldMappings.id}][_eq]=${encodeURIComponent(id)}`
        })
        queryString += `&page=1`

        setTotalCount(filteredItemIdsTotal.length)
      } else {
        queryString += `&page=${currentPage}`
      }

      if (statusFilter !== 'all') {
        switch (statusFilter) {
          case 'unread':
            queryString += `&filter[${apiFieldMappings.read}][_eq]=false`
            queryString += `&filter[${apiFieldMappings.is_quote}][_eq]=false`
            queryString += `&filter[${apiFieldMappings.is_til}][_eq]=false`
            break
          case 'read':
            queryString += `&filter[${apiFieldMappings.read}][_eq]=true`
            break
          case 'quote':
            queryString += `&filter[${apiFieldMappings.is_quote}][_eq]=true`
            break
          case 'til':
            queryString += `&filter[${apiFieldMappings.is_til}][_eq]=true`
            break
        }
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
      const data: ApiResponse = await response.json()

      setBookmarks(data?.data || [])
    } catch (err) {
      console.error('Error fetching bookmarks:', err)
      setError(true)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch bookmarks')
    } finally {
      setLoading(false)
    }
  }

  const fetchCount = async () => {
    try {
      const [token, apiUrl] = await Promise.all([
        storage.getKey('readingsApiToken'),
        storage.getKey('readingsApi'),
      ])

      if (!token || !apiUrl) {
        return
      }

      let queryString = `aggregate[countDistinct]=${apiFieldMappings.id}`

      if (statusFilter !== 'all') {
        switch (statusFilter) {
          case 'unread':
            queryString += `&filter[${apiFieldMappings.read}][_eq]=false`
            queryString += `&filter[${apiFieldMappings.is_quote}][_eq]=false`
            queryString += `&filter[${apiFieldMappings.is_til}][_eq]=false`
            break
          case 'read':
            queryString += `&filter[${apiFieldMappings.read}][_eq]=true`
            break
          case 'quote':
            queryString += `&filter[${apiFieldMappings.is_quote}][_eq]=true`
            break
          case 'til':
            queryString += `&filter[${apiFieldMappings.is_til}][_eq]=true`
            break
        }
      }

      const response = await fetch(`${apiUrl}?${queryString}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        console.error('Failed to fetch count:', response.status)
        return
      }

      const data = await response.json()
      const count = data?.data?.[0]?.countDistinct?.[apiFieldMappings.id] || []

      setTotalCount(count)
    } catch (err) {
      console.error('Error fetching count:', err)
    }
  }

  /**
   * Work around to get all bookmark tags and enable tag filtering
   * since Directus doesn't support filtering by tags
   * see discussion: https://github.com/directus/directus/discussions/7277
   */
  const fetchAvailableTags = async () => {
    try {
      const [token, apiUrl] = await Promise.all([
        storage.getKey('readingsApiToken'),
        storage.getKey('readingsApi'),
      ])

      if (!token || !apiUrl) {
        return
      }

      const fieldsToFetch = [apiFieldMappings.tags, apiFieldMappings.id]

      const fieldsQuery = fieldsToFetch
        .map((field) => `fields[]=${encodeURIComponent(field)}`)
        .join('&')

      // TODO: If the reading list is larger than 1000, we need to fetch the tags in chunks
      let queryString = `${fieldsQuery}&limit=1000`

      // Filter out items without tags
      queryString += `&filter[_and][0][tags][_nnull]=true`

      const response = await fetch(`${apiUrl}?${queryString}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        console.error('Failed to fetch tags:', response.status)
        return
      }

      const data = await response.json()
      const items = data?.data || []
      const tagMap: Record<string, string[]> = {}
      const allTags = new Set<string>()

      items.forEach((item: any) => {
        const itemId = item[apiFieldMappings.id]
        const itemTags = item[apiFieldMappings.tags] || []

        const tags = Array.isArray(itemTags) ? itemTags : [itemTags]

        tags.forEach((tag: string) => {
          if (tag && typeof tag === 'string') {
            const normalizedTag = tag.toLowerCase()
            allTags.add(normalizedTag)
            if (!tagMap[normalizedTag]) {
              tagMap[normalizedTag] = []
            }
            tagMap[normalizedTag].push(itemId.toString())
          }
        })
      })

      setTagToItemsMap(tagMap)
      setAvailableTags(Array.from(allTags).sort((a, b) => a.localeCompare(b)))
    } catch (err) {
      console.error('Error fetching available tags:', err)
    }
  }

  const getItemIdsByTags = (tags: string[]): string[] => {
    if (tags.length === 0) return []

    const itemIds = new Set<string>()

    // Union all items that have any of the selected tags (OR logic)
    tags.forEach((tag) => {
      const tagItems = tagToItemsMap[tag] || []
      tagItems.forEach((id) => itemIds.add(id))
    })

    return Array.from(itemIds)
  }

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    setCurrentPage(1)
    fetchBookmarks()
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
    setCurrentPage(1)
    if (status === 'all') {
      fetchCount()
    }
  }

  const handleTagFilter = (tag: string) => {
    const _tag = tag.toLowerCase()
    let newSelectedTags = [...selectedTags]

    if (selectedTags.includes(_tag)) {
      newSelectedTags = selectedTags.filter((t) => t !== _tag)
    } else {
      newSelectedTags.push(_tag)
    }

    if (newSelectedTags.length === 0) {
      fetchCount()
    }
    setSelectedTags(newSelectedTags)
    setCurrentPage(1)
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
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
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
            height: 'fit-content',
            minHeight: '100vh',
            width: '100vw',
            position: 'absolute',
            backgroundColor: '#0f1011',
            zIndex: 0,
            backgroundImage: 'url(/img/bg.svg)',
            backgroundRepeat: 'repeat',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <main style={{ padding: '32px 0', margin: 'auto', maxWidth: '1000px' }}>
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
                pb: 2,
              }}
            >
              BOOKMARKS ({totalCount})
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
                      <Core.MenuItem value={apiFieldMappings.estimated_time}>
                        Estimated Time
                      </Core.MenuItem>
                      <Core.MenuItem value={apiFieldMappings.author}>Author</Core.MenuItem>
                    </Core.Select>
                  </Core.FormControl>
                </Core.Grid>
                <Core.Grid xs={6} md={1.5} item>
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
                <Core.Grid xs={12} md={1.5} item>
                  <Core.FormControl fullWidth size="small">
                    <Core.InputLabel>Status</Core.InputLabel>
                    <Core.Select
                      value={statusFilter}
                      label="Status"
                      onChange={(event) => handleStatusFilter(event.target.value)}
                    >
                      <Core.MenuItem value="all">All</Core.MenuItem>
                      <Core.MenuItem value="unread">Unread</Core.MenuItem>
                      <Core.MenuItem value="read">Read</Core.MenuItem>
                      <Core.MenuItem value="quote">Quote</Core.MenuItem>
                      <Core.MenuItem value="til">TIL</Core.MenuItem>
                    </Core.Select>
                  </Core.FormControl>
                </Core.Grid>
              </Core.Grid>
              {/* Tag Filter */}
              {availableTags.length > 0 && (
                <Core.Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mt: 2 }}
                >
                  <Core.FormControl size="small" sx={{ minWidth: '30%' }}>
                    <Core.InputLabel>Filter by tags</Core.InputLabel>
                    <Core.Select
                      multiple
                      value={selectedTags}
                      label="Filter by tags"
                      onChange={(event) => {
                        const value =
                          typeof event.target.value === 'string'
                            ? event.target.value.split(',')
                            : event.target.value
                        setSelectedTags(value)
                        setCurrentPage(1)
                        if (value.length === 0) {
                          fetchCount()
                        }
                      }}
                      renderValue={(selected) => (
                        <Core.Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Core.Chip key={value} label={value} size="small" />
                          ))}
                        </Core.Box>
                      )}
                      MenuProps={{
                        PaperProps: {
                          style: {
                            maxHeight: 300,
                            width: 250,
                          },
                        },
                      }}
                    >
                      {availableTags.map((tag) => (
                        <Core.MenuItem key={tag} value={tag}>
                          {tag}
                        </Core.MenuItem>
                      ))}
                    </Core.Select>
                  </Core.FormControl>
                </Core.Box>
              )}
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
                    <Core.CardContent
                      sx={{ px: 4, py: 2, cursor: 'pointer', '&:hover': { bgcolor: '#1a1a1a' } }}
                      onClick={() => openReadingLink(item)}
                    >
                      <Core.Grid container spacing={2} alignItems="center">
                        <Core.Grid xs={12} md={8} item>
                          <Core.Typography
                            variant="h6"
                            component="div"
                            sx={{
                              color: '#F8FAF6',
                              fontWeight: 500,
                              cursor: 'pointer',
                              mb: 3,
                              '&:hover': { color: '#4fc3f7' },
                            }}
                          >
                            {getDisplayValue(item, 'title') || 'Untitled'}
                          </Core.Typography>

                          <Core.Box
                            sx={{
                              display: 'flex',
                              gap: 0.5,
                              flexWrap: 'wrap',
                              mb: 1,
                            }}
                          >
                            {getDisplayValue(item, 'is_quote') && (
                              <Core.Chip
                                label="Quote"
                                size="small"
                                color="primary"
                                variant="outlined"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStatusFilter('quote')
                                }}
                              />
                            )}
                            {getDisplayValue(item, 'is_til') && (
                              <Core.Chip
                                label="TIL"
                                size="small"
                                color="info"
                                variant="outlined"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStatusFilter('til')
                                }}
                              />
                            )}

                            {!getDisplayValue(item, 'read') &&
                              !getDisplayValue(item, 'is_til') &&
                              !getDisplayValue(item, 'is_quote') && (
                                <>
                                  <Core.Chip
                                    label="Unread"
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStatusFilter('unread')
                                    }}
                                  />
                                  {getDisplayValue(item, 'estimated_time') && (
                                    <Core.Chip
                                      label={`${getDisplayValue(item, 'estimated_time')} min`}
                                      size="small"
                                      variant="outlined"
                                    />
                                  )}
                                </>
                              )}
                            {/* TODO: add onclick to the github repo chip */}
                            {getDisplayValue(item, 'link').includes('github.com') && (
                              <Core.Chip
                                label="Github repo"
                                size="small"
                                color="info"
                                variant="outlined"
                              />
                            )}
                            {Array.isArray(getDisplayValue(item, 'tags')) &&
                              getDisplayValue(item, 'tags').length > 0 &&
                              (getDisplayValue(item, 'tags') as string[]).map(
                                (tag: string, tagIndex: number) => (
                                  <Core.Chip
                                    key={tagIndex}
                                    label={tag.toLowerCase()}
                                    size="small"
                                    sx={{ fontSize: '0.7rem' }}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleTagFilter(tag)
                                    }}
                                  />
                                ),
                              )}
                          </Core.Box>

                          {item.date_created && (
                            <Core.Typography
                              variant="caption"
                              sx={{ color: '#666', display: 'block' }}
                            >
                              {formatDate(item.date_created)}
                              {getDisplayValue(item, 'author') &&
                                ` • by ${getDisplayValue(item, 'author')}`}
                            </Core.Typography>
                          )}
                        </Core.Grid>

                        <Core.Grid
                          xs={12}
                          md={4}
                          item
                          sx={{ textAlign: { xs: 'left', md: 'right' } }}
                        >
                          <Icons.OpenInNew />
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
                  {searchQuery || selectedTags.length > 0 || statusFilter !== 'all'
                    ? 'No bookmarks match your current filters. Try adjusting your search or filters.'
                    : 'Start by adding some bookmarks using the extension popup or sidebar.'}
                </Core.Typography>
              </Core.Card>
            )}

            {/* Pagination */}
            {!loading && !error && totalPages > 1 && (
              <Core.Card
                elevation={1}
                sx={{
                  p: 2,
                  pt: 0,
                  maxWidth: '1000px',
                  margin: 'auto',
                  display: 'flex',
                  justifyContent: 'center',
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                  marginTop: '-16px',
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
