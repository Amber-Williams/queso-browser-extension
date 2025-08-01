export interface ApiFieldMappings {
  id: string
  date_created: string
  title: string
  link: string
  author: string
  estimated_time: string
  is_quote: string
  is_til: string
  tags: string
  read: string
  notes: string
  snapshot: string
}

export const defaultApiFieldMappings: ApiFieldMappings = {
  id: 'id',
  date_created: 'date_created',
  title: 'title',
  link: 'link',
  author: 'author',
  estimated_time: 'estimated_time',
  is_quote: 'is_quote',
  is_til: 'is_til',
  read: 'read',
  tags: 'tags',
  snapshot: 'snapshot',
  notes: 'notes',
}

export const apiFieldDataTypes: Record<keyof ApiFieldMappings, string> = {
  id: 'integer',
  date_created: 'datetime',
  title: 'string',
  link: 'string',
  author: 'string',
  estimated_time: 'integer',
  is_quote: 'boolean',
  is_til: 'boolean',
  tags: 'string[]',
  read: 'boolean',
  notes: 'string',
  snapshot: 'string',
}
