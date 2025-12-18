# Immich Fork - Adaptation Summary

This document describes the adaptation of obsidian-google-photos to work with Immich.

## Original Author

**Original plugin**: obsidian-google-photos by Alan Grainger

-   https://github.com/alangrainger/obsidian-google-photos

## Fork Author

**Adapted for Immich**: Bobiko

## Key Changes from Google Photos to Immich

### 1. Authentication

-   **Old**: Google OAuth flow with refresh tokens
-   **New**: Immich API Key authentication (x-api-key header)

### 2. URL Configuration

-   **New**: Support for both local and remote Immich URLs
-   Local URL (IP): Tries first, then falls back to remote if unavailable
-   Remote URL: Public/external Immich instance

### 3. API Endpoints

-   **Old**: `https://photoslibrary.googleapis.com/v1/mediaItems:search`
-   **New**:
    -   Memories: `http(s)://immich-server/api/memories?for=YYYY-MM-DD`
    -   Asset metadata: `http(s)://immich-server/api/search/metadata`
    -   Thumbnail: `http(s)://immich-server/api/assets/{id}/thumbnail`
    -   Original: `http(s)://immich-server/api/assets/{id}/original`

### 4. Photo Filtering

-   **Old**: Date filtering by API query parameter
-   **New**: Client-side filtering by `localDateTime` field to show photos from same month/day across different years

### 5. Configuration Storage

-   Settings now store Immich URLs and API key instead of Google OAuth tokens

### 6. Download Options

-   **New**: Toggle to download photos locally or link directly to Immich server
-   Uses Obsidian's attachment folder settings when downloading

### 7. Code Cleanup

-   Removed all Google OAuth code
-   Removed Google Picker API integration
-   Simplified modal from complex polling to direct asset loading
-   Renamed types: `GooglePhotosMediaItem` → `ImmichMediaItem`
-   Updated all class references to use Immich terminology

## Files Modified

-   `src/photosApi.ts`: Complete rewrite for Immich API
-   `src/settings.ts`: Replaced OAuth UI with Immich connection settings
-   `src/photoModal.ts`: Simplified modal for Immich asset selection
-   `src/renderer.ts`: Updated thumbnail loading with API key
-   `manifest.json`: Updated plugin ID, author, description, version
-   `package.json`: Updated author, version, dependencies
-   `README.md`: New Immich setup documentation
-   `styles.css`: Added Immich-specific styles (loader, year sections)

## Features Enabled by Immich

1. **Multi-year memories**: Shows photos from the same date across multiple years
2. **Local/remote fallback**: Works with both local network and public Immich instances
3. **Zero OAuth**: Simpler setup - just paste an API key
4. **Flexible storage**: Choose to download or link directly to your Immich server
5. **Daily notes integration**: Automatic date detection from front matter

## Version History

-   **v1.0.0**: Initial Immich fork with full migration from Google Photos
