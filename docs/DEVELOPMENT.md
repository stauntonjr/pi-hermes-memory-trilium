# Development Guide for pi-hermes-memory-trilium

## Project Structure

```
pi-hermes-memory-trilium/
├── src/
│   ├── index.ts              # Main extension entry
│   ├── config.ts             # Configuration (env vars)
│   ├── trilium-sync.ts       # Sync logic
│   └── tools/
│       └── trilium-tools.ts  # MCP wrapper
├── docs/
│   └── README.md             # User documentation
├── package.json
└── README.md                 # Main documentation
```

## Setup

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Watch for changes
npm run watch
```

## Development

### Add New Features

1. Add code to `src/` directory
2. Run `npm run build` to compile
3. Test with Pi

### Add New Commands

```typescript
pi.on("command", async (event, ctx) => {
  if (event.command === "/your-command") {
    // Handle command
  }
});
```

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

## Configuration

The extension uses **environment variables** for configuration:

```bash
export TRILIUM_SERVER_NAME="triliumnext-md-srv"
export TRILIUM_PARENT_NOTE_ID="root/Memory"
export TRILIUM_SYNC_ON_SESSION_END="true"
```

### Config Options

| Variable | Default | Description |
|----------|---------|-------------|
| `TRILIUM_SYNC_ENABLED` | `true` | Enable sync |
| `TRILIUM_SERVER_NAME` | `triliumnext-md-srv` | MCP server name |
| `TRILIUM_PARENT_NOTE_ID` | `root/Memory` | Root note ID |
| `TRILIUM_SYNC_ON_SESSION_END` | `true` | Sync on session end |
| `TRILIUM_SYNC_ON_BACKGROUND_REVIEW` | `true` | Sync on background review |
| `TRILIUM_SYNC_DELAY_MS` | `5000` | Debounce delay (ms) |
| `TRILIUM_CREATE_HIERARCHY` | `true` | Auto-create folders |
| `TRILIUM_INCLUDE_SOURCE_INFO` | `true` | Add metadata |

## Debugging

```bash
# Start Pi with extension
pi -e ./dist/index.js

# Check logs
tail -f ~/.pi/agent/logs/*.log
```

## Publishing

```bash
# Build
npm run build

# Publish to npm
npm publish
```
