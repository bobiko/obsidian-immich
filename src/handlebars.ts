export interface HandlebarTemplate {
  local_thumbnail_link?: string;
  google_photo_url?: string; // legacy compatibility
  google_photo_id?: string; // legacy compatibility
  google_photo_desc?: string; // legacy compatibility
  google_base_url?: string; // legacy compatibility
  immich_photo_url?: string;
  immich_photo_id?: string;
  immich_photo_desc?: string;
  immich_base_url?: string;
  taken_date?: string
}

export function handlebarParse(content: string, template: HandlebarTemplate) {
  for (const key of Object.keys(template) as Array<keyof HandlebarTemplate>) {
    content = content.replace(new RegExp(`\\{{\\s*${key}\\s*}\\}`, 'gi'), template[key] as string)
  }
  return content
}
