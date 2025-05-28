interface TurndownService {
  isCodeBlock: (node: Node) => boolean
  options: TurndownOptions
  keep: (filter: (node: Node) => boolean) => void
  addRule: (key: string, rule: Rule) => void
}

interface TurndownOptions {
  preserveNestedTables?: boolean
  [key: string]: any
}

interface Rule {
  filter: string | string[] | ((node: Node, options?: TurndownOptions) => boolean)
  replacement: (content: string, node: Node, options?: TurndownOptions) => string
}

interface AlignmentVotes {
  left: number
  right: number
  center: number
  '': number
}

const indexOf = Array.prototype.indexOf
const every = Array.prototype.every
const rules: Record<string, Rule> = {}
const alignMap: Record<string, string> = { left: ':---', right: '---:', center: ':---:' }

let isCodeBlock_: ((node: Node) => boolean) | null = null
let options_: TurndownOptions | null = null

const tableShouldBeSkippedCache_ = new WeakMap<Node, boolean>()

function getAlignment(node: Node | null): string {
  if (!node) return ''
  const element = node as HTMLElement
  return (element.getAttribute?.('align') || (element as any).style?.textAlign || '').toLowerCase()
}

function getBorder(alignment: string): string {
  return alignment ? alignMap[alignment] : '---'
}

function getColumnAlignment(table: HTMLTableElement, columnIndex: number): string {
  const votes: AlignmentVotes = {
    left: 0,
    right: 0,
    center: 0,
    '': 0,
  }

  let align = ''

  for (let i = 0; i < table.rows.length; ++i) {
    const row = table.rows[i]
    if (columnIndex < row.childNodes.length) {
      const cellAlignment = getAlignment(row.childNodes[columnIndex] as Node)
      ++votes[cellAlignment as keyof AlignmentVotes]

      if (votes[cellAlignment as keyof AlignmentVotes] > votes[align as keyof AlignmentVotes]) {
        align = cellAlignment
      }
    }
  }

  return align
}

rules.tableCell = {
  filter: ['th', 'td'],
  replacement: function (content: string, node: Node): string {
    if (tableShouldBeSkipped(nodeParentTable(node))) return content
    return cell(content, node)
  },
}

rules.tableRow = {
  filter: 'tr',
  replacement: function (content: string, node: Node): string {
    const parentTable = nodeParentTable(node)
    if (tableShouldBeSkipped(parentTable)) return content

    let borderCells = ''

    if (isHeadingRow(node as HTMLTableRowElement)) {
      const colCount = tableColCount(parentTable as HTMLTableElement)
      for (let i = 0; i < colCount; i++) {
        const childNode = i < node.childNodes.length ? (node.childNodes[i] as Node) : null
        const border = getBorder(getColumnAlignment(parentTable as HTMLTableElement, i))
        borderCells += cell(border, childNode, i)
      }
    }
    return '\n' + content + (borderCells ? '\n' + borderCells : '')
  },
}

rules.table = {
  filter: function (node: Node, options?: TurndownOptions): boolean {
    return node.nodeName === 'TABLE'
  },

  replacement: function (content: string, node: Node): string {
    const tableElement = node as HTMLTableElement

    if (tableShouldBeHtml(tableElement, options_!)) {
      const html = (tableElement as HTMLElement).outerHTML
      const divParent = nodeParentDiv(node)
      if (divParent === null) {
        return `\n\n<div>${html}</div>\n\n`
      } else {
        return html
      }
    } else {
      if (tableShouldBeSkipped(tableElement)) return content

      content = content.replace(/\n+/g, '\n')

      const contentLines = content.trim().split('\n')
      let secondLine = ''
      if (contentLines.length >= 2) secondLine = contentLines[1]
      const secondLineIsDivider = /\| :?---/.test(secondLine)

      const columnCount = tableColCount(tableElement)
      let emptyHeader = ''
      if (columnCount && !secondLineIsDivider) {
        emptyHeader = '|' + '     |'.repeat(columnCount) + '\n' + '|'
        for (let columnIndex = 0; columnIndex < columnCount; ++columnIndex) {
          emptyHeader += ' ' + getBorder(getColumnAlignment(tableElement, columnIndex)) + ' |'
        }
      }

      const captionContent = tableElement.caption ? tableElement.caption.textContent || '' : ''
      const caption = captionContent ? `${captionContent}\n\n` : ''
      const tableContent = `${emptyHeader}${content}`.trimStart()
      return `\n\n${caption}${tableContent}\n\n`
    }
  },
}

rules.tableCaption = {
  filter: ['caption'],
  replacement: (): string => '',
}

rules.tableColgroup = {
  filter: ['colgroup', 'col'],
  replacement: (): string => '',
}

rules.tableSection = {
  filter: ['thead', 'tbody', 'tfoot'],
  replacement: function (content: string): string {
    return content
  },
}

function isHeadingRow(tr: HTMLTableRowElement): boolean {
  const parentNode = tr.parentNode as HTMLElement
  return (
    parentNode.nodeName === 'THEAD' ||
    (parentNode.firstChild === tr &&
      (parentNode.nodeName === 'TABLE' || isFirstTbody(parentNode)) &&
      every.call(tr.childNodes, function (n: Node | ChildNode) {
        return n.nodeName === 'TH'
      }))
  )
}

function isFirstTbody(element: HTMLElement): boolean {
  const previousSibling = element.previousSibling as HTMLElement | null
  return (
    element.nodeName === 'TBODY' &&
    (!previousSibling ||
      (previousSibling.nodeName === 'THEAD' && /^\s*$/i.test(previousSibling.textContent || '')))
  )
}

function cell(content: string, node: Node | null = null, index: number | null = null): string {
  if (index === null && node && node.parentNode) {
    index = indexOf.call(node.parentNode.childNodes, node)
  }
  let prefix = ' '
  if (index === 0) prefix = '| '
  let filteredContent = content.trim().replace(/\n\r/g, '<br>').replace(/\n/g, '<br>')
  filteredContent = filteredContent.replace(/\|+/g, '\\|')
  while (filteredContent.length < 3) filteredContent += ' '
  if (node) filteredContent = handleColSpan(filteredContent, node as HTMLElement, ' ')
  return prefix + filteredContent + ' |'
}

function nodeContainsTable(node: Node): boolean {
  if (!node.childNodes) return false

  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i]
    if (child.nodeName === 'TABLE') return true
    if (nodeContainsTable(child)) return true
  }
  return false
}

const nodeContains = (node: Node, types: string | string[]): boolean => {
  if (!node.childNodes) return false

  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i]
    if (types === 'code' && isCodeBlock_ && isCodeBlock_(child)) return true
    if (Array.isArray(types) && types.includes(child.nodeName)) return true
    if (nodeContains(child, types)) return true
  }

  return false
}

const tableShouldBeHtml = (tableNode: HTMLTableElement, options: TurndownOptions): boolean => {
  const possibleTags = ['UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'BLOCKQUOTE']

  if (options.preserveNestedTables) possibleTags.push('TABLE')

  return nodeContains(tableNode, 'code') || nodeContains(tableNode, possibleTags)
}

function tableShouldBeSkipped(tableNode: Node | null): boolean {
  if (!tableNode) return true

  const cached = tableShouldBeSkippedCache_.get(tableNode)
  if (cached !== undefined) return cached

  const result = tableShouldBeSkipped_(tableNode)

  tableShouldBeSkippedCache_.set(tableNode, result)
  return result
}

function tableShouldBeSkipped_(tableNode: Node): boolean {
  if (!tableNode) return true
  const tableElement = tableNode as HTMLTableElement
  if (!tableElement.rows) return true
  if (tableElement.rows.length === 1 && tableElement.rows[0].childNodes.length <= 1) return true
  if (nodeContainsTable(tableNode)) return true
  return false
}

function nodeParentDiv(node: Node): HTMLElement | null {
  let parent = node.parentNode as HTMLElement | null
  while (parent && parent.nodeName !== 'DIV') {
    parent = parent.parentNode as HTMLElement | null
    if (!parent) return null
  }
  return parent
}

function nodeParentTable(node: Node | null): HTMLTableElement | null {
  if (!node) return null
  let parent = node.parentNode as HTMLElement | null
  while (parent && parent.nodeName !== 'TABLE') {
    parent = parent.parentNode as HTMLElement | null
    if (!parent) return null
  }
  return parent as HTMLTableElement
}

function handleColSpan(content: string, node: HTMLElement, emptyChar: string): string {
  const colspan = parseInt(node.getAttribute?.('colspan') || '1', 10)
  for (let i = 1; i < colspan; i++) {
    content += ' | ' + emptyChar.repeat(3)
  }
  return content
}

function tableColCount(node: HTMLTableElement): number {
  let maxColCount = 0
  for (let i = 0; i < node.rows.length; i++) {
    const row = node.rows[i]
    const colCount = row.childNodes.length
    if (colCount > maxColCount) maxColCount = colCount
  }
  return maxColCount
}

export default function tables(turndownService: TurndownService): void {
  isCodeBlock_ = turndownService.isCodeBlock
  options_ = turndownService.options

  turndownService.keep(function (node: Node): boolean {
    if (
      node.nodeName === 'TABLE' &&
      tableShouldBeHtml(node as HTMLTableElement, turndownService.options)
    )
      return true
    return false
  })

  for (const key in rules) {
    turndownService.addRule(key, rules[key])
  }
}
