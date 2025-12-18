// Deprecated: OAuth is not used in Immich plugin.
// This file remains as a stub to avoid build issues if referenced.
import ImmichPlugin from './main'

export default class OAuth {
  // No-op: Immich uses API key authentication (x-api-key) and does not require OAuth.
  plugin: ImmichPlugin
  constructor(plugin: ImmichPlugin) {
    this.plugin = plugin
  }
}
// Legacy OAuth implementation removed. Immich plugin uses API key authentication.
