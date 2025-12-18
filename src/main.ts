import { MarkdownView, Plugin, Editor, moment, TFile } from 'obsidian'
import PhotosApi from './photosApi'
import { ImmichSettingTab, ImmichSettings, DEFAULT_SETTINGS, GetDateFromOptions } from './settings'
import { PickerModal } from './photoModal'
import CodeblockProcessor from './codeblockProcessor'

export default class ImmichPlugin extends Plugin {
  settings: ImmichSettings
  photosApi: PhotosApi

  async onload() {
    await this.loadSettings()

    this.photosApi = new PhotosApi(this)

    this.addSettingTab(new ImmichSettingTab(this.app, this))

    // Codeblock handler
    this.registerMarkdownCodeBlockProcessor('photos', (source, el, context) => {
      const file = app.vault.getAbstractFileByPath(context.sourcePath)
      if (file instanceof TFile) {
        new CodeblockProcessor(this, source, el, file)
      }
    })

    // Immich memories codeblock: ```immichMemories```
    this.registerMarkdownCodeBlockProcessor('immichMemories', (source, el, context) => {
      const file = app.vault.getAbstractFileByPath(context.sourcePath)
      if (file instanceof TFile) {
        new CodeblockProcessor(this, source, el, file)
      }
    })

    this.addCommand({
      id: 'insert-immich-photo',
      name: 'Insert Immich Photo',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView)
        if (markdownView) {
          new PickerModal(this.app, this, editor, view).open()
        }
      }
    })
  }

  onunload() {
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }

  /**
   * Gets the date from the note title, front matter, or returns today based on user setting
   * This is kept for compatibility with existing settings but is no longer used for photo filtering
   * @param file
   */
  getNoteDate(file: TFile): moment.Moment {
    if (this.settings.getDateFrom === GetDateFromOptions.NOTE_TITLE) {
      // Get date from note title
      return moment(file.basename, this.settings.getDateFromFormat, true)
    } else if (this.settings.getDateFrom === GetDateFromOptions.FRONT_MATTER) {
      // Get date from frontmatter / YAML
      const meta = this.app.metadataCache.getFileCache(file)
      const frontMatter = meta?.frontmatter
      if (frontMatter && frontMatter[this.settings.getDateFromFrontMatterKey]) {
        return moment(frontMatter[this.settings.getDateFromFrontMatterKey], this.settings.getDateFromFormat, true)
      } else {
        return moment('invalid date')
      }
    } else {
      // Elses return today's date
      return moment()
    }
  }
}
