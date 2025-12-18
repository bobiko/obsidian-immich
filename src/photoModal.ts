import {
  App,
  Editor,
  MarkdownView,
  Modal,
  Notice,
  requestUrl,
  moment
} from 'obsidian'
import { GridView, ThumbnailImage } from './renderer'
import ImmichPlugin from './main'
import { handlebarParse } from './handlebars'

export class PhotosModal extends Modal {
  plugin: ImmichPlugin
  gridView: GridView
  editor: Editor
  view: MarkdownView

  constructor(app: App, plugin: ImmichPlugin, editor: Editor, view: MarkdownView) {
    super(app)
    this.plugin = plugin
    this.editor = editor
    this.view = view
  }

  /**
   * Save a local thumbnail and insert the thumbnail plus a link back to the original Immich asset
   * @param event
   */
  async insertImageIntoEditor(event: MouseEvent) {
    try {
      const thumbnailImage = <ThumbnailImage>event.target
      const s = this.plugin.settings
      const cursorPosition = this.editor.getCursor()

      if (s.downloadImages) {
        // Download mode: save image locally using Obsidian's attachment settings
        const src = this.plugin.photosApi.getThumbnailUrl(thumbnailImage.photoId)

        // Get Obsidian's attachment folder setting
        // @ts-ignore - accessing internal Obsidian API
        const attachmentFolder = this.app.vault.getConfig('attachmentFolderPath') || '.'
        const activeFile = this.view.file

        // Resolve attachment path based on Obsidian settings
        let targetFolder = attachmentFolder
        if (attachmentFolder === './') {
          // Same folder as current note
          targetFolder = activeFile.parent?.path || ''
        } else if (attachmentFolder.startsWith('./')) {
          // Relative to current note
          const noteFolder = activeFile.parent?.path || ''
          targetFolder = noteFolder + '/' + attachmentFolder.substring(2)
        }
        // else: absolute path from vault root

        targetFolder = targetFolder.replace(/^\/+/, '').replace(/\/+$/, '')
        const linkPath = targetFolder ? targetFolder + '/' + thumbnailImage.filename : thumbnailImage.filename

        // Create folder if needed
        if (targetFolder && !await this.app.vault.adapter.exists(targetFolder)) {
          await this.app.vault.createFolder(targetFolder)
        }

        // Fetch and save image
        const imageData = await requestUrl({
          url: src,
          headers: { 'x-api-key': s.immichApiKey }
        })
        await this.app.vault.adapter.writeBinary(
          targetFolder ? targetFolder + '/' + thumbnailImage.filename : thumbnailImage.filename,
          imageData.arrayBuffer
        )

        // Insert markdown with local path
        const linkText = handlebarParse(s.thumbnailMarkdown, {
          local_thumbnail_link: encodeURI(linkPath),
          google_photo_id: thumbnailImage.photoId,
          google_photo_url: thumbnailImage.productUrl,
          google_photo_desc: thumbnailImage.description || '',
          google_base_url: thumbnailImage.baseUrl,
          immich_photo_id: thumbnailImage.photoId,
          immich_photo_url: thumbnailImage.productUrl,
          immich_photo_desc: thumbnailImage.description || '',
          immich_base_url: thumbnailImage.baseUrl,
          taken_date: thumbnailImage.creationTime.format()
        })
        this.editor.replaceRange(linkText, cursorPosition)
        this.editor.setCursor({ line: cursorPosition.line, ch: cursorPosition.ch + linkText.length })
      } else {
        // Link-only mode: insert direct Immich URL
        const imageUrl = thumbnailImage.productUrl // original URL
        const linkText = handlebarParse(s.thumbnailMarkdown, {
          local_thumbnail_link: imageUrl,
          google_photo_id: thumbnailImage.photoId,
          google_photo_url: thumbnailImage.productUrl,
          google_photo_desc: thumbnailImage.description || '',
          google_base_url: thumbnailImage.baseUrl,
          immich_photo_id: thumbnailImage.photoId,
          immich_photo_url: thumbnailImage.productUrl,
          immich_photo_desc: thumbnailImage.description || '',
          immich_base_url: thumbnailImage.baseUrl,
          taken_date: thumbnailImage.creationTime.format()
        })
        this.editor.replaceRange(linkText, cursorPosition)
        this.editor.setCursor({ line: cursorPosition.line, ch: cursorPosition.ch + linkText.length })
      }
    } catch (e) {
      console.error('[Immich] Error inserting image:', e)
      new Notice('Błąd podczas wstawiania zdjęcia: ' + (e as Error).message)
    }
    this.close()
  }

  onClose() {
    this.gridView?.destroy()
  }
}

export class PickerModal extends PhotosModal {
  usedBaseUrl: string | null = null

  async onOpen() {
    const { contentEl, modalEl } = this
    modalEl.addClass('immich-modal-grid')

    // Show loading message with spinner
    contentEl.createEl('h2', { text: 'Immich' })
    const loaderContainer = contentEl.createDiv('immich-loader-container')
    const spinner = loaderContainer.createDiv('immich-spinner')
    const statusEl = loaderContainer.createEl('p', { text: 'Ładowanie zdjęć z Immich...' })

    try {
      // Try to get date from current note's front matter
      let filterDate: string | undefined
      const cache = this.app.metadataCache.getFileCache(this.view.file)
      if (cache?.frontmatter) {
        // Try common front matter keys for date (prefer title first)
        const dateValue = cache.frontmatter.title || cache.frontmatter.created || cache.frontmatter.date
        if (dateValue && typeof dateValue === 'string') {
          const parsedDate = moment(dateValue, ['YYYY-MM-DD', 'YYYY-MM-DD HH:mm'], true)
          if (parsedDate.isValid()) {
            filterDate = parsedDate.format('YYYY-MM-DD')
            console.log(`[Immich] Using date from front matter: ${filterDate}`)
            statusEl.setText(`Ładowanie zdjęć z dnia ${filterDate}...`)
          }
        }
      }

      // Load assets for the specific date
      const { items, usedBaseUrl } = await this.plugin.photosApi.listRecentAssets(filterDate)
      this.usedBaseUrl = usedBaseUrl

      // Remove loader
      loaderContainer.remove()

      if (items.length > 0) {
        // Group photos by year
        const photosByYear = new Map<number, typeof items>()
        for (const item of items) {
          const creationMoment = moment(item.mediaMetadata.creationTime)
          const year = creationMoment.year()
          console.log(`[Immich] Item: ${item.filename}, creationTime: ${item.mediaMetadata.creationTime}, year: ${year}`)
          if (!photosByYear.has(year)) {
            photosByYear.set(year, [])
          }
          photosByYear.get(year)!.push(item)
        }

        // Sort years descending
        const sortedYears = Array.from(photosByYear.keys()).sort((a, b) => b - a)

        contentEl.createEl('p', { text: `Znaleziono ${items.length} zdjęć. Kliknij zdjęcie, aby wstawić do notatki:` })

        // Create grid view for each year
        for (const year of sortedYears) {
          const yearSection = contentEl.createDiv('immich-year-section')
          const yearCount = photosByYear.get(year)?.length || 0
          const yearLabel = year === moment().year() ? `${year} (ten rok)` : `${year} (${moment().year() - year} lat temu)`
          yearSection.createEl('h3', { text: yearLabel, cls: 'immich-year-header' })

          const gridContainer = yearSection.createDiv('immich-grid-container')
          const gridView = new GridView({
            scrollEl: this.modalEl,
            plugin: this.plugin,
            onThumbnailClick: event => this.insertImageIntoEditor(event)
          })

          await gridView.appendThumbnailsToElement(gridView.containerEl, photosByYear.get(year)!, event => this.insertImageIntoEditor(event))
          gridContainer.appendChild(gridView.containerEl)
        }
      } else {
        contentEl.createEl('p', { text: 'Brak zdjęć do wyświetlenia. Dodaj zdjęcia w Immich i spróbuj ponownie.' })
      }
    } catch (error) {
      console.error('Failed to load Immich assets:', error)
      loaderContainer.remove()
      contentEl.createEl('p', { text: 'Błąd podczas ładowania zdjęć: ' + (error as Error).message })
    }
  }
  onClose() {
    super.onClose()
  }
}

function lowerCaseFirstLetter(string: string) {
  return string.charAt(0).toLowerCase() + string.slice(1)
}
