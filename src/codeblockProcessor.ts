import { moment, requestUrl, TFile, MarkdownView } from 'obsidian'
import ImmichPlugin from './main'

export default class CodeblockProcessor {
  plugin: ImmichPlugin
  source: string
  parentEl: HTMLElement
  note: TFile
  noteDate: moment.Moment

  constructor(plugin: ImmichPlugin, source: string, parentEl: HTMLElement, file: TFile) {
    this.plugin = plugin
    this.source = source
    this.parentEl = parentEl
    this.note = file

    this.noteDate = plugin.getNoteDate(file)
    this.parseContents()
  }

  parseContents() {
    const source = this.source.trim()

    // New Immich memories block: load memories for the note's date
    if (source === '' || source === 'immichMemories') {
      this.loadImmichMemories()
      return
    }

    // Legacy/deprecated handlers
    this.createDeprecationNotice()

    if (!source) {
      return
    }

    if (source === 'today') {
      this.showDeprecatedFeature('"Today" photo filtering')
      return
    } else if (source === 'notedate') {
      this.showDeprecatedFeature('Note date photo filtering')
      return
    } else {
      // Deprecated: This codeblock format was for Google Photos
      // Use the "Insert Immich Photo" command instead
      let params = {
        query: null,
        title: null
      }
      try {
        params = JSON.parse(this.source)
        this.showDeprecatedFeature('Photo search queries')
        return
      } catch (e) {
        // Unable to parse codeblock contents
        this.showDeprecatedFeature('Photo search')
        return
      }
    }
  }

  /**
   * Load and render Immich memories for the note's date.
   * If frontmatter has created/date/title, that date is used; otherwise today's date.
   */
  async loadImmichMemories() {
    const loadingEl = this.parentEl.createEl('div', { cls: 'immich-codeblock-loading' })
    loadingEl.createEl('p', { text: 'Ładowanie wspomnień z Immich...' })

    try {
      // Detect date from front matter
      let filterDate: string | undefined
      const metadata = this.plugin.app.metadataCache.getFileCache(this.note)
      if (metadata?.frontmatter) {
        const dateValue = metadata.frontmatter.title || metadata.frontmatter.created || metadata.frontmatter.date
        if (dateValue && typeof dateValue === 'string') {
          const parsedDate = moment(dateValue, ['YYYY-MM-DD', 'YYYY-MM-DD HH:mm'], true)
          if (parsedDate.isValid()) {
            filterDate = parsedDate.format('YYYY-MM-DD')
          }
        }
      }

      // Fetch memories
      const { items } = await this.plugin.photosApi.listRecentAssets(filterDate)
      loadingEl.remove()

      if (items.length === 0) {
        this.parentEl.createEl('p', { text: 'Brak zdjęć z tego dnia', cls: 'immich-codeblock-empty' })
        return
      }

      // Group by year
      const photosByYear = new Map<number, typeof items>()
      for (const item of items) {
        const year = moment(item.mediaMetadata.creationTime).year()
        if (!photosByYear.has(year)) {
          photosByYear.set(year, [])
        }
        photosByYear.get(year)!.push(item)
      }

      const sortedYears = Array.from(photosByYear.keys()).sort((a, b) => b - a)

      for (const year of sortedYears) {
        const yearSection = this.parentEl.createDiv('immich-year-section')
        const yearLabel = year === moment().year() ? `${year} (ten rok)` : `${year} (${moment().year() - year} lat temu)`
        yearSection.createEl('h4', { text: yearLabel, cls: 'immich-year-header' })

        const gridDiv = yearSection.createDiv('immich-codeblock-grid')

        for (const item of photosByYear.get(year)!) {
          const imgWrapper = gridDiv.createDiv('immich-codeblock-img-wrapper')
          const img = imgWrapper.createEl('img', { cls: 'immich-codeblock-img' })

          try {
            const imageUrl = this.plugin.photosApi.getThumbnailUrl(item.id)
            const imageData = await requestUrl({
              url: imageUrl,
              headers: { 'x-api-key': this.plugin.settings.immichApiKey }
            })
            const blob = new Blob([imageData.arrayBuffer], { type: 'image/jpeg' })
            const blobUrl = URL.createObjectURL(blob)
            img.src = blobUrl
            img.style.cursor = 'pointer'

            img.onclick = async () => {
              const editor = this.plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor
              if (editor) {
                const pos = editor.getCursor()
                const md = `![](${item.productUrl})`
                editor.replaceRange(md, pos)
                editor.setCursor({ line: pos.line, ch: pos.ch + md.length })
              }
            }
          } catch (e) {
            console.error('[Immich] Thumbnail error:', e)
            img.alt = 'Błąd miniatury'
          }
        }
      }
    } catch (error) {
      loadingEl.remove()
      this.parentEl.createEl('p', { text: 'Błąd podczas ładowania wspomnień: ' + (error as Error).message, cls: 'immich-codeblock-error' })
      console.error('[Immich] Error loading memories:', error)
    }
  }

  createDeprecationNotice() {
    const noticeEl = this.parentEl.createEl('div', { cls: 'immich-warning' })
    noticeEl.createEl('p', {
      text: '📋 Codeblock queries are no longer supported.'
    })
    noticeEl.createEl('p', {
      text: '💡 Use the "Insert Immich Photo" command instead to pick photos from Immich.'
    })
  }

  showDeprecatedFeature(featureName: string) {
    this.message(`⚠️ ${featureName} is no longer supported.`)
  }

  message(text: string) {
    this.parentEl.createEl('p', { text })
  }
}
