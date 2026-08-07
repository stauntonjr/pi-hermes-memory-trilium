# pi-hermes-memory-trilium

**Standalone extension that adds Trilium sync to pi-hermes-memory**

---

## Overview

This extension provides persistent, cross-device memory synchronization between your Pi sessions and a Trilium server.

### What It Does

| Feature | Description |
|---------|-------------|
| ✅ Session-end sync | Automatically syncs memory to Trilium on session end |
| ✅ Background review sync | Syncs after the agent extracts learnings |
| ✅ Manual sync | Trigger sync via `/trilium-sync` command |
| ✅ Content change detection | Only syncs when content actually changes |
| ✅ Automatic hierarchy | Creates `root/Memory/` folder structure |
| ✅ Backward compatible | Works with or without Trilium enabled |

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Pi Agent                              │
│  ┌────────────────────────────────────────────────────┐  │
│  │  pi-hermes-memory (extension)                   │  │
│  │  - Session lifecycle hooks                        │  │
│  │  - Background review loop                         │  │
│  │  - Correction detection                           │  │
│  └────────────────────────────────────────────────────┘  │
│               │                                        │
│               ▼                                        │
│      [Trilium Sync Module]                            │
│      - Debounced sync                                 │
│      - Change detection                               │
│               │                                        │
│               ▼                                        │
│      [1mcp Server]                                     │
│      - Trilium MCP tools                              │
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
- Trilium server accessible (e.g., `https://YOUR-TRILIUM-SERVER.com/etapi`)

### Install Extension

```bash
pi install npm:pi-hermes-memory-trilium
```

### Create Memory Structure in Trilium

Create these notes in Trilium web UI:

```
root/
└── Memory/
    ├── Memory.md/
    ├── User Profile/
    ├── Lessons/
    └── Skills/
```

---

## Configuration

### Config File: `~/.pi/agent/pi-hermes-memory-trilium/config.json`

```json
{
  "enabled": true,
  "parentNoteId": "root/Memory",
  "syncOnSessionEnd": true,
  "syncOnBackgroundReview": true,
  "syncDelayMs": 5000,
  "createHierarchy": true,
  "includeSourceInfo": true
}
```

### Config Options

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `true` | Enable Trilium sync |
| `parentNoteId` | `root/Memory` | Root note ID in Trilium |
| `syncOnSessionEnd` | `true` | Sync when session ends |
| `syncOnBackgroundReview` | `true` | Sync after background review |
| `syncDelayMs` | `5000` | Debounce delay (ms) |
| `createHierarchy` | `true` | Auto-create folder structure |
| `includeSourceInfo` | `true` | Add metadata comments |

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
- Configurable via `syncOnBackgroundReview`

### Manual Sync

Use the command to manually trigger sync:

```bash
/trilium-sync
```

---

## Files Structure

```
pi-hermes-memory-trilium/
├── src/
│   ├── index.ts          # Extension entry point
│   ├── trilium-sync.ts   # Sync logic
│   └── tools/
│       └── trilium-tools.ts  # MCP wrapper
├── package.json
├── README.md
├── config.schema.json
└── docs/
    └── integration-guide.md
```

---

## How It Works

### 1. Session Start
- Extension loads
- Trilium sync module initializes
- Connects to Trilium MCP tools

### 2. Session Runs
- pi-hermes-memory tracks changes
- Background review extracts learnings
- No sync yet (debouncing)

### 3. Session Ends
- Trilium sync triggers
- Checks if content changed (hash comparison)
- If changed: syncs to Trilium
- If not changed: skips

### 4. Next Session
- Loads from local cache
- Also has copy in Trilium for cross-device

---

## Key Features

### Content Change Detection

```typescript
// Calculates hash of content
const hash = calculateHash(content);

// Only syncs if hash changed
if (existingNote.hash !== newHash) {
  await syncToTrilium();
}
```

### Debounced Sync

```typescript
// Prevents rapid-fire updates
if (Date.now() - lastSyncTime < 5000) {
  return; // Wait 5 seconds
}
```

### Automatic Hierarchy

```typescript
// Creates folder structure if needed
root/
└── Memory/
    ├── Memory.md/
    ├── User Profile/
    ├── Lessons/
    └── Skills/
```

---

## Troubleshooting

### Issue: "Trilium server not reachable"

**Solution:**
- Check Trilium server is running
- Verify URL: `https://YOUR-TRILIUM-SERVER.com/etapi`
- Check SSL certificate is trusted

### Issue: "No notes appearing in Trilium"

**Solution:**
- Check `enabled: true` in config
- Verify session is actually ending
- Check Pi logs for `[TriliumSync]` messages

### Issue: "pi-hermes-memory-trilium not found"

**Solution:**
- Ensure pi-hermes-memory is installed first
- Check extension is in `~/.pi/agent/extensions/`
- Restart Pi to reload extensions

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
# Create test config
echo '{"enabled": true}' > config.json

# Start Pi with extension
pi -e ./src/index.ts
```

---

## Related Projects

| Project | Description |
|---------|-------------|
| [pi-hermes-memory](https://github.com/chandra447/pi-hermes-memory) | Original extension this extends |
| [TriliumNext](https://github.com/TriliumNext/TriliumNext) | Knowledge base backend |
| [pi-mcp-extension](https://github.com/irahardianto/pi-mcp-extension) | MCP server for Pi |

---

## License

MIT

---

## Support

- Open an issue on GitHub
- Check the docs folder for detailed guides
- Review the examples in the examples/ folder
