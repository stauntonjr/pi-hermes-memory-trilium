# pi-hermes-memory-trilium

**Standalone extension that adds Trilium sync to pi-hermes-memory**

---

## Overview

This extension provides persistent, cross-device memory synchronization between your Pi sessions and a Trilium server.

### What It Does

| Feature | Description |
|---------|-------------|
| ✅ Automatic sync on session end | Syncs memory to Trilium when session ends |
| ✅ Manual sync command | Trigger sync via `/trilium-sync` command |
| ✅ Background review sync | Syncs after agent extracts learnings |
| ✅ Content change detection | Only syncs when content actually changes (hash-based) |
| ✅ Debounced sync | 5-second delay to prevent rapid updates |
| ✅ Individual entry sync | Each memory entry becomes a separate Trilium note |
| ✅ Metadata preservation | Labels for category, source, timestamp |
| ✅ Automatic hierarchy | Creates `root/Memory/` folder structure |
| ✅ Backward compatible | Works with or without Trilium enabled |
| ✅ Orphaned note archival | Marks deleted entries with `#archived` label |
| ⚠️ No content updates | Content cannot be updated after creation (Trilium API limitation) |

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Pi Agent                              │
│  ┌────────────────────────────────────────────────────┐  │
│  │  pi-hermes-memory-trilium (extension)           │  │
│  │  - Session lifecycle hooks                        │  │
│  │  - Background review loop                         │  │
│  │  - Content change detection                       │  │
│  │  - Note archival for deleted entries              │  │
│  └────────────────────────────────────────────────────┘  │
│               │                                        │
│               ▼                                        │
│      [Direct HTTP API]                                 │
│      - Trilium Etapi API                               │
│               │                                        │
│               ▼                                        │
│      [Trilium Server]                                  │
│      - Long-term storage                               │
│      - Cross-device sync                               │
└──────────────────────────────────────────────────────────┘
```

---

## Installation

### Prerequisites

- Pi coding agent installed
- pi-hermes-memory extension installed
- Self-hosted TriliumNext server (Etapi API)

### Configure Environment Variables

```bash
export TRILIUM_API_URL="https://YOUR-TRILIUM-SERVER.com/etapi"
export TRILIUM_API_TOKEN="YOUR-TRILIUM-API-TOKEN-HERE"
export TRILIUM_PARENT_NOTE_ID="root"
export PI_HERMES_MEMORY_DIR="/path/to/pi-hermes-memory"
export TRILIUM_ENABLE_SSL_VERIFY="false"
```

### Install Extension

```bash
pi install npm:pi-hermes-memory-trilium
```

### Configure via Environment Variables

```bash
export TRILIUM_API_URL="https://YOUR-TRILIUM-SERVER.com/etapi"
export TRILIUM_API_TOKEN="your-api-token-here"
export TRILIUM_PARENT_NOTE_ID="root"
export PI_HERMES_MEMORY_DIR="/path/to/pi-hermes-memory"
export TRILIUM_ENABLE_SSL_VERIFY="false"
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TRILIUM_API_URL` | `https://YOUR-TRILIUM-SERVER.com/etapi` | Trilium Etapi API URL |
| `TRILIUM_API_TOKEN` | (required) | Trilium API token |
| `TRILIUM_PARENT_NOTE_ID` | `root` | Parent note ID for synced memory |
| `PI_HERMES_MEMORY_DIR` | `/path/to/pi-hermes-memory` | Directory containing memory files |
| `TRILIUM_ENABLE_SSL_VERIFY` | `false` | Enable SSL certificate verification |

### Sync Behavior

| Trigger | Description |
|---------|-------------|
| Session end | Syncs all memory entries when session shuts down |
| Background review | Syncs after agent extracts learnings |
| Manual `/trilium-sync` | User-triggered sync |

---

## Usage

### Automatic Sync

**On session end:**
```bash
pi
# Complete a session
# Syncs automatically to Trilium
```

**On background review:**
- The extension triggers sync after the agent extracts learnings

### Manual Sync

Use the command to manually trigger sync:

```bash
/trilium-sync
```

---

## Memory Entry Format

Each memory entry from `MEMORY.md`, `USER.md`, or `failures.md` becomes a separate Trilium note.

### Entry Structure

```markdown
Some memory content here <!-- created=2026-08-06, last=2026-08-06 -->
§
Another entry <!-- created=2026-08-06, last=2026-08-06 -->
```

### Trilium Note Attributes

Each synced note has these labels:

| Label | Description |
|-------|-------------|
| `category` | `failure`, `correction`, `insight`, `preference`, `convention`, or `memory` |
| `source` | `MEMORY.md`, `USER.md`, or `failures.md` |
| `timestamp` | ISO date string (e.g., `2026-08-06`)

**Note:** Content is not updated after initial creation due to Trilium API limitations. If the content changes in the local memory files, the extension will skip updating the existing Trilium note. |

---

## How It Works

### 1. Entry Parsing
- Reads `MEMORY.md`, `USER.md`, `failures.md`
- Splits on `§` delimiter
- Extracts metadata (created/last timestamps)
- Calculates unique ID per entry (SHA256 hash)

### 2. Note Sync
- Searches Trilium for existing note by ID
- If exists: content is not updated (Trilium API limitation - content stored in blob)
- If not exists: creates new note with metadata

### 3. Change Detection
- Stores hash of last sync in `.last-sync` file
- Only syncs if content hash changed
- Skips unchanged entries (content cannot be updated after creation)

### 4. Deletion Handling
- Tracks all Trilium note IDs
- Compares with current entries
- Marks orphaned notes as `#archived` (soft delete)

---

## Examples

### Memory Entry (MEMORY.md)
```markdown
pi-hermes-memory sync-trilium-memory: The extension syncs memory entries to Trilium. Each entry becomes a separate note with category, source, and timestamp labels. <!-- created=2026-08-06, last=2026-08-06 -->
§
TriliumNext MCP tools: create_note, update_note, delete_note, sync_directory_to_trilium. All require precise parameter handling. <!-- created=2026-08-06, last=2026-08-06 -->
```

### Resulting Trilium Notes

**Note 1: `pi-hermes-memory sync-trilium-memory`**
- Title: `7a8f2b3c...` (SHA256 hash)
- Labels:
  - `category`: `memory`
  - `source`: `MEMORY.md`
  - `timestamp`: `2026-08-06`

**Note 2: `TriliumNext MCP tools`**
- Title: `8b9c3d4d...` (SHA256 hash)
- Labels:
  - `category`: `memory`
  - `source`: `MEMORY.md`
  - `timestamp`: `2026-08-06`

---

## Troubleshooting

### Issue: "Trilium server not reachable"

**Solution:**
- Check Trilium server is running
- Verify URL: `https://YOUR-SERVER.com/etapi`
- Check SSL certificate is trusted
- Verify environment variables are set

### Issue: "No notes appearing in Trilium"

**Solution:**
- Check `TRILIUM_API_URL` and `TRILIUM_API_TOKEN` are set
- Verify session is actually ending
- Check Pi logs for `[pi-hermes-memory-trilium]` messages
- Check network connectivity to Trilium server

### Issue: "Permission denied" or "403 Forbidden"

**Solution:**
- Verify API token has read/write permissions
- Check Trilium server is not requiring additional authentication
- Verify no firewall is blocking the connection

### Issue: "Note already exists" but content not updating

**Solution:**
- The extension uses content hash comparison
- Check if content actually changed
- The sync includes a 5-second debounce period

---

## Development

### Run Tests

```bash
npm test
```

### Build Extension

```bash
npm run build
```

### Manual Testing

```bash
# Set environment variables
export TRILIUM_API_URL="https://YOUR-TRILIUM-SERVER.com/etapi"
export TRILIUM_API_TOKEN="your-token"

# Start Pi with extension
pi
```

### Development Commands

```bash
# Watch mode
npm run watch

# Lint
npm run lint

# Format
npm run format
```

---

## Related Projects

| Project | Description |
|---------|-------------|
| [pi-hermes-memory](https://github.com/chandra447/pi-hermes-memory) | Original extension this extends |
| [triliumnext-mcp](https://github.com/TriliumNext/TriliumNext) | Official Trilium MCP server |
| [pi-mcp-adapter](https://github.com/1mcp/1mcp) | MCP server for Pi |

---

## License

MIT

---

## Support

- Open an issue on GitHub
- Check the docs folder for detailed guides
- Review the examples in the examples/ folder
