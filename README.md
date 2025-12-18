# Immich for Obsidian

A plugin to insert photos from your [Immich](https://immich.app/) server into your [Obsidian](https://obsidian.md/) notes.

> **Note**: This is a fork of [obsidian-google-photos](https://github.com/alangrainger/obsidian-google-photos), adapted to work with Immich instead of Google Photos.

## Features

-   📸 Insert photos from your Immich server into Obsidian notes
-   🔗 Automatic fallback between local and remote URLs
-   🔑 API key authentication (no OAuth needed)
-   📅 Photos grouped by year - see your memories from past years
-   📥 Download photos locally or link directly to Immich
-   🎯 Automatic date detection from note front matter

## Installation

1. Install the plugin in Obsidian Community Plugins (or place files in `.obsidian/plugins/immich/`)
2. Enable the plugin
3. Configure your Immich server details in Settings

## Setup

1. **Get your Immich API Key**:

    - Open your Immich server
    - Go to Profile → API Keys
    - Create a new API key

2. **Configure in Obsidian**:

    - Settings → Community Plugins → Immich
    - **Local URL (Immich)**: Your local URL (e.g. `http://192.168.1.10:2283`)
    - **Remote URL (Immich)**: Your remote URL (e.g. `https://photos.example.com`)
    - **Immich API Key**: Paste your API key
    - **Prefer local URL**: Toggle to try local first, then fallback to remote

3. **Choose how to insert photos**:
    - **Download images locally** (ON): Downloads photos to your vault
    - **Download images locally** (OFF): Links directly to Immich

## Usage

1. Open your Obsidian note
2. Run command: "Insert Immich Photo"
3. The modal shows photos from today's date (detected from note's front matter)
4. Photos are grouped by year - see memories from past years
5. Click a photo to insert it into your note

### Codeblock: immichMemories

Embed memories for the note's date (from front matter `created`/`date`/`title`):

````markdown
```immichMemories

```
````

````

Photos load from that calendar day across years and group by year. Click a photo to insert a link to Immich.

## Front Matter

The plugin automatically detects the date from your note's front matter:

```yaml
---
created: 2025-12-18
title: My Daily Note
---
````

The plugin will show all photos taken on December 18th from any year. Supported front matter keys (precedence): `title`, `created`, `date`

## Development

```bash
npm install
npm run build
```

## License

GPL-3.0 license

---

![](https://img.shields.io/github/license/bobiko/obsidian-immich) ![](https://img.shields.io/github/v/release/bobiko/obsidian-immich?style=flat-square) ![](https://img.shields.io/github/downloads/bobiko/obsidian-immich/total)

## Attribution

-   Original plugin: [obsidian-google-photos](https://github.com/alangrainger/obsidian-google-photos) by Alan Grainger
-   Loading spinner from [loading.io](https://loading.io/)

```

```
