import { moment, requestUrl } from 'obsidian'
import ImmichPlugin from './main'

export type ImmichMediaItem = {
  id: string,
  description: string,
  productUrl: string,
  baseUrl: string,
  mimeType: string,
  mediaMetadata: {
    creationTime: string
  },
  filename: string
}

// Minimal Immich asset type used by this plugin
export type ImmichAsset = {
  id: string
  type?: string
  originalFileName?: string
  exifInfo?: { dateTimeOriginal?: string }
  createdAt?: string
  localDateTime?: string
  isFavorite?: boolean
  duration?: string
  fileCreatedAt?: string
  fileModifiedAt?: string
  checksum?: string
}

export default class PhotosApi {
  plugin: ImmichPlugin

  constructor(plugin: ImmichPlugin) {
    this.plugin = plugin
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.plugin.settings.immichApiKey || ''
    }
  }

  private get baseUrls(): string[] {
    const s = this.plugin.settings
    const urls: string[] = []
    const local = s.immichLocalUrl?.trim()
    const remote = s.immichRemoteUrl?.trim()
    if (s.preferLocal) {
      if (local) urls.push(local)
      if (remote) urls.push(remote)
    } else {
      if (remote) urls.push(remote)
      if (local) urls.push(local)
    }
    return urls.filter(Boolean)
  }

  /**
   * Make an authenticated request to Immich API (tries local, then remote)
   */
  async request<T = unknown>(endpoint: string, init: RequestInit = {}): Promise<{ data: T, usedBaseUrl: string }> {
    const urls = this.baseUrls
    if (urls.length === 0) {
      throw new Error('Immich base URL is not configured')
    }
    let lastErr: any
    for (const base of urls) {
      const url = base + endpoint
      try {
        const mergedHeaders = { ...this.headers, ...(init.headers as any || {}) }
        const resp = await requestUrl({
          url,
          method: (init.method || 'GET') as any,
          headers: mergedHeaders,
          body: init.body as any
        })
        const status = resp.status
        console.log(`[Immich] Got ${status} from ${base}`)
        if (status >= 200 && status < 300) {
          const ct = resp.headers['content-type'] || ''
          const data = ct.includes('application/json') ? resp.json : resp.text
          console.log(`[Immich] Success using ${base}`)
          return { data: data as T, usedBaseUrl: base }
        }
        const errorText = resp.text
        if (status === 401 || status === 403) {
          throw new Error(`Immich auth error (${status}): ${errorText}`)
        }
        console.warn(`[Immich] Got ${status}, will try next URL`)
        lastErr = new Error(`Immich request failed ${status} at ${url}`)
      } catch (e) {
        console.error(`[Immich] Exception at ${base}:`, e)
        lastErr = e
      }
    }
    throw lastErr || new Error('Immich request failed')
  }

  /**
   * List assets for a specific date using memories endpoint
   * Filters by localDateTime to get photos from that date across multiple years
   */
  async listRecentAssets(targetDate?: string): Promise<{ items: ImmichMediaItem[], usedBaseUrl: string }> {
    // Use the provided date or today's date
    const dateToFetch = targetDate || moment().format('YYYY-MM-DD')
    const endpoint = `/api/memories?for=${dateToFetch}`

    console.log(`[Immich] Fetching memories for ${dateToFetch}`)
    const { data, usedBaseUrl } = await this.request<any>(endpoint, { method: 'GET' })

    // Response is array of memory objects, each with assets array
    let assetList: ImmichAsset[] = []
    if (Array.isArray(data)) {
      // Flatten all assets from all memories for this date
      for (const memory of data) {
        if (memory.assets && Array.isArray(memory.assets)) {
          assetList.push(...memory.assets)
        }
      }
    }

    // Filter by localDateTime to only get photos from this specific month/day (any year)
    const targetMoment = moment(dateToFetch, 'YYYY-MM-DD')
    const targetMonth = targetMoment.month()
    const targetDay = targetMoment.date()

    const filtered = assetList.filter(asset => {
      // Use localDateTime if available, fallback to other date fields
      const dateStr = asset.localDateTime || asset.exifInfo?.dateTimeOriginal || asset.createdAt || asset.fileCreatedAt
      if (!dateStr) return false

      const assetMoment = moment(dateStr)
      if (!assetMoment.isValid()) return false

      // Match month and day regardless of year
      return assetMoment.month() === targetMonth && assetMoment.date() === targetDay
    })

    const items = filtered.map(a => this.convertImmichAsset(a, usedBaseUrl))
    console.log(`[Immich] Successfully loaded ${items.length} assets for ${dateToFetch}`)
    return { items, usedBaseUrl }
  }

  convertImmichAsset(asset: ImmichAsset, baseUrl: string): ImmichMediaItem {
    // Use localDateTime as primary source, fallback to other date fields
    const taken = asset.localDateTime || asset.exifInfo?.dateTimeOriginal || asset.createdAt || asset.fileCreatedAt || moment().toISOString()
    const filename = asset.originalFileName || `immich-${asset.id}.jpg`
    return {
      id: asset.id,
      description: '',
      productUrl: this.getOriginalUrl(asset.id, baseUrl),
      baseUrl: this.getOriginalUrl(asset.id, baseUrl),
      mimeType: 'image/jpeg',
      mediaMetadata: { creationTime: taken },
      filename
    }
  }

  getThumbnailUrl(assetId: string, baseUrl?: string, size: 'thumbnail' | 'preview' = 'thumbnail'): string {
    // Correct Immich thumbnail endpoint: /api/assets/{id}/thumbnail
    const used = baseUrl || this.baseUrls[0]
    return `${used}/api/assets/${assetId}/thumbnail?size=${size}`
  }

  getOriginalUrl(assetId: string, baseUrl?: string): string {
    // Correct Immich original file endpoint: /api/assets/{id}/original
    const used = baseUrl || this.baseUrls[0]
    return `${used}/api/assets/${assetId}/original`
  }
}
