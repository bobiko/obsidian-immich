import { App, PluginSettingTab, Setting } from 'obsidian'
import { FolderSuggest } from './suggesters/FolderSuggester'
import GooglePhotos from './main'

export enum GetDateFromOptions {
  NOTE_TITLE = 'Note\'s title',
  FRONT_MATTER = 'Note\'s front matter',
  USE_TODAY = 'Use today\'s date',
}

export interface ImmichSettings {
  // Immich connection
  immichLocalUrl: string; // e.g. http://192.168.1.10:2283
  immichRemoteUrl: string; // e.g. https://photos.example.com
  immichApiKey: string; // Immich API key (x-api-key)
  preferLocal: boolean; // try local first, fallback to remote
  downloadImages: boolean; // true = download, false = link only
  thumbnailWidth: number;
  thumbnailHeight: number;
  filename: string;
  thumbnailMarkdown: string;
  locationOption: string;
  locationFolder: string;
  locationSubfolder: string;
  convertPastedLink: boolean; // Monitor paste events to see if it's a Google Photo link
  // Legacy settings kept for compatibility but no longer used for filtering
  defaultToDailyPhotos: boolean;
  getDateFrom: GetDateFromOptions;
  getDateFromFrontMatterKey: string;
  getDateFromFormat: string;
  showPhotosInDateRange: boolean;
  showPhotosXDaysPast: number;
  showPhotosXDaysFuture: number;
}

export const DEFAULT_SETTINGS: ImmichSettings = {
  immichLocalUrl: '',
  immichRemoteUrl: '',
  immichApiKey: '',
  preferLocal: true,
  downloadImages: true,
  thumbnailWidth: 400,
  thumbnailHeight: 280,
  filename: 'YYYY-MM-DD[_immich_]HHmmss[.jpg]',
  thumbnailMarkdown: '[![]({{local_thumbnail_link}})]({{immich_photo_url}}) ',
  locationOption: 'note',
  locationFolder: '',
  locationSubfolder: 'photos',
  convertPastedLink: true,
  // Legacy settings - kept for compatibility but no longer functional
  defaultToDailyPhotos: true,
  getDateFrom: GetDateFromOptions.NOTE_TITLE,
  getDateFromFrontMatterKey: 'date',
  getDateFromFormat: 'YYYY-MM-DD',
  showPhotosInDateRange: false,
  showPhotosXDaysPast: 7,
  showPhotosXDaysFuture: 1
}

export class ImmichSettingTab extends PluginSettingTab {
  plugin: GooglePhotos

  constructor(app: App, plugin: GooglePhotos) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this

    containerEl.empty()

    new Setting(containerEl)
      .setName('Immich')
      .setHeading()

    /*
     API Update Notice
     */
    new Setting(containerEl)
      .setDesc('Połącz Obsidian z Twoją instancją Immich. Możesz podać lokalny i zdalny adres URL – wtyczka spróbuje lokalnego najpierw i w razie błędu przełączy się na zdalny.')
      .setClass('google-photos-api-notice')

    /*
     Limitations Notice
     */
    new Setting(containerEl)
      .setName('Jak to działa')
      .setDesc('• Użyj polecenia „Wstaw zdjęcie z Immich"\n• Wybierz zdjęcie z listy zasobów Immich\n• Zdjęcie zostanie pobrane lub zlinkowane (w zależności od ustawień)')
      .setClass('google-photos-limitations')

    new Setting(containerEl)
      .setName('Pobierać zdjęcia lokalnie')
      .setDesc('Włączone: pobiera zdjęcia do vaultu. Wyłączone: wstawia tylko link do Immich.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.downloadImages)
        .onChange(async (value) => {
          this.plugin.settings.downloadImages = value
          await this.plugin.saveSettings()
        }))

    /**
     * Show or hide a setting item
     * @param {Setting} setting
     * @param {boolean} visible
     */
    const setVisible = (setting: Setting, visible: boolean) => {
      setting.settingEl.style.display = visible ? 'flex' : 'none'
    }

    /*
     Immich connection
     */
    new Setting(containerEl)
      .setName('Lokalny adres URL (Immich)')
      .setDesc('Np. http://192.168.1.10:2283 – używany w sieci domowej')
      .addText(text => text
        .setPlaceholder('http://192.168.1.10:2283')
        .setValue(this.plugin.settings.immichLocalUrl)
        .onChange(async value => {
          this.plugin.settings.immichLocalUrl = value.trim().replace(/\/$/, '')
          await this.plugin.saveSettings()
        }))
    new Setting(containerEl)
      .setName('Zdalny adres URL (Immich)')
      .setDesc('Np. https://photos.example.com – używany poza siecią lokalną')
      .addText(text => text
        .setPlaceholder('https://photos.example.com')
        .setValue(this.plugin.settings.immichRemoteUrl)
        .onChange(async value => {
          this.plugin.settings.immichRemoteUrl = value.trim().replace(/\/$/, '')
          await this.plugin.saveSettings()
        }))
    new Setting(containerEl)
      .setName('Preferuj lokalny adres')
      .setDesc('Próbuj najpierw lokalnego adresu; w razie błędu przełącz na zdalny')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.preferLocal)
        .onChange(async value => {
          this.plugin.settings.preferLocal = value
          await this.plugin.saveSettings()
        }))
    new Setting(containerEl)
      .setName('Immich API Key')
      .setDesc('Utwórz klucz API w Immich (Profil → API Keys) i wklej tutaj')
      .addText(text => text
        .setPlaceholder('immich_api_key')
        .setValue(this.plugin.settings.immichApiKey)
        .onChange(async value => {
          this.plugin.settings.immichApiKey = value.trim()
          await this.plugin.saveSettings()
        }))

    /*
     Thumbnail settings
     */

    new Setting(containerEl)
      .setName('Thumbnail settings')
      .setHeading()
      .setDesc('Configure the locally-saved thumbnail images. Images will fit within these dimensions while keeping the original aspect ratio.')
    new Setting(containerEl)
      .setName('Thumbnail width')
      .setDesc('Maximum width of the locally-saved thumbnail image in pixels')
      .addText(text => text
        .setPlaceholder(DEFAULT_SETTINGS.thumbnailWidth.toString())
        .setValue(this.plugin.settings.thumbnailWidth.toString())
        .onChange(async value => {
          this.plugin.settings.thumbnailWidth = +value
          await this.plugin.saveSettings()
        }))
    new Setting(containerEl)
      .setName('Thumbnail height')
      .setDesc('Maximum height of the locally-saved thumbnail image in pixels')
      .addText(text => text
        .setPlaceholder(DEFAULT_SETTINGS.thumbnailHeight.toString())
        .setValue(this.plugin.settings.thumbnailHeight.toString())
        .onChange(async value => {
          this.plugin.settings.thumbnailHeight = +value
          await this.plugin.saveSettings()
        }))
    new Setting(containerEl)
      .setName('Image filename format')
      .addText(text => text
        .setPlaceholder(DEFAULT_SETTINGS.filename)
        .setValue(this.plugin.settings.filename)
        .onChange(async value => {
          this.plugin.settings.filename = value.trim()
          await this.plugin.saveSettings()
        }))
      .then(setting => {
        setting.descEl.appendText('This is the filename format used for saving thumbnail images. It must be in ')
        setting.descEl.createEl('a', {
          text: 'MomentJS format',
          href: 'https://momentjs.com/docs/#/displaying/format/'
        })
        setting.descEl.appendText('.')
        setting.descEl.createEl('br')
        setting.descEl.createEl('br')
        setting.descEl.appendText('The default value is')
        setting.descEl.createEl('br')
        setting.descEl.createEl('span', { cls: 'markdown-rendered' })
          .createEl('code', { text: 'YYYY-MM-DD[_immich_]HHmmss[.jpg]' })
        setting.descEl.createEl('br')
        setting.descEl.appendText('which will save thumbnails in a format like:')
        setting.descEl.createEl('br')
        setting.descEl.createEl('br')
        setting.descEl.appendText('2022-12-25_immich_182557.jpg')
        setting.descEl.createEl('br')
        setting.descEl.createEl('br')
        setting.descEl.appendText('The date used is the "photo taken" date from the photo\'s metadata rather than the current date/time.')
      })
    const locationOptionEl = new Setting(this.containerEl)
    const locationFolderEl = new Setting(this.containerEl)
      .setName('Thumbnail image folder')
      .setDesc('Thumbnails will be saved to this folder')
      .addSearch(search => {
        new FolderSuggest(search.inputEl)
        search.setPlaceholder('Path/For/Thumbnails')
          .setValue(this.plugin.settings.locationFolder)
          .onChange(async value => {
            this.plugin.settings.locationFolder = value.trim()
            await this.plugin.saveSettings()
          })
      })
    const locationSubfolderEl = new Setting(this.containerEl)
      .setName('Subfolder name')
      .setDesc('If your current note is in "Journal/Daily" and you set the subfolder name to "photos", the thumbnails will be saved in "Journal/Daily/photos".')
      .addText(text => {
        text
          .setPlaceholder('photos')
          .setValue(this.plugin.settings.locationSubfolder)
          .onChange(async value => {
            // Strip leading/trailing slashes
            this.plugin.settings.locationSubfolder = value.trim().replace(/^[\\/]+/, '').replace(/[\\/]+$/, '')
            await this.plugin.saveSettings()
          })
      })
    locationOptionEl
      .setName('Location to save thumbnails')
      .setDesc('Where the local thumbnail images will be saved')
      .addDropdown(dropdown => {
        dropdown
          .addOption('note', 'Same folder as the note')
          .addOption('subfolder', 'In a subfolder of the current note')
          .addOption('specified', 'In a specific folder')
          .setValue(this.plugin.settings.locationOption)
          .onChange(async value => {
            // Show or hide the folder input field, depending on the choice
            setVisible(locationFolderEl, value === 'specified')
            setVisible(locationSubfolderEl, value === 'subfolder')
            this.plugin.settings.locationOption = value
            await this.plugin.saveSettings()
          })
      })
      .then(() => {
        // Set the default visibility for the folder input field
        setVisible(locationFolderEl, this.plugin.settings.locationOption === 'specified')
        setVisible(locationSubfolderEl, this.plugin.settings.locationOption === 'subfolder')
      })
    new Setting(containerEl)
      .setName('Inserted Markdown')
      .setDesc('This will be the text inserted when adding a thumbnail. You can use these variables:')
      .addTextArea(text => text
        .setPlaceholder(DEFAULT_SETTINGS.thumbnailMarkdown)
        .setValue(this.plugin.settings.thumbnailMarkdown)
        .onChange(async value => {
          this.plugin.settings.thumbnailMarkdown = value
          await this.plugin.saveSettings()
        }))
      .then(setting => {
        const ul = setting.descEl.createEl('ul')
        ul.createEl('li').setText('local_thumbnail_link - The path to the locally saved thumbnail image')
        ul.createEl('li').setText('immich_photo_url - The URL to the original Immich asset')
        ul.createEl('li').setText('immich_photo_desc - The description/caption from Immich')
        ul.createEl('li').setText('taken_date - The date the photo was taken')
        ul.createEl('li').setText('immich_base_url - Advanced variable, Immich API base URL used')
        ul.createEl('li').setText('immich_photo_id - Advanced variable, Immich asset ID')
      })
  }
}
