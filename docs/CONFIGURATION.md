# Configuration Examples for pi-hermes-memory-trilium

## Quick Start (Direct Server - Recommended)

### 1. Configure Direct Trilium MCP Server

Create or update your Pi MCP config at `~/.pi/agent/mcp.json`:

```json
{
  "mcpServers": {
    "triliumnext-md-srv": {
      "command": "npx",
      "args": ["triliumnext-mcp"],
      "env": {
        "TRILIUM_BASE": "https://YOUR-TRILIUM-SERVER.com/etapi",
        "TRILIUM_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

### 2. Install the Extension

```bash
pi install npm:pi-hermes-memory-trilium
```

### 3. Restart Pi

```bash
pi --reload
```

That's it! The extension will automatically:
- Use `triliumnext-md-srv` as the MCP server
- Sync on session end
- Sync on background review
- Create `root/Memory/` hierarchy

---

## Alternative: Through 1mcp Aggregator

If you already use 1mcp as your MCP aggregator:

### 1. Configure 1mcp

```json
{
  "mcpServers": {
    "1mcp": {
      "transport": "streamable-http",
      "url": "https://YOUR-MCP-SERVER.com/mcp"
    }
  }
}
```

### 2. Set Environment Variable

```bash
export TRILIUM_SERVER_NAME="1mcp"
```

The extension will automatically use the correct tool names.

---

## Advanced Configuration

### Set Custom Parent Note ID

```bash
export TRILIUM_PARENT_NOTE_ID="MyMemoryFolder"
```

### Disable Background Review Sync

```bash
export TRILIUM_SYNC_ON_BACKGROUND_REVIEW="false"
```

### Increase Debounce Delay

```bash
export TRILIUM_SYNC_DELAY_MS="10000"  # 10 seconds
```

### Disable Auto-Hierarchy Creation

```bash
export TRILIUM_CREATE_HIERARCHY="false"
```

### Include Source Info in Notes

```bash
export TRILIUM_INCLUDE_SOURCE_INFO="true"  # Default
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TRILIUM_SYNC_ENABLED` | No | `true` | Enable/disable sync |
| `TRILIUM_SERVER_NAME` | No | `triliumnext-md-srv` | MCP server name |
| `TRILIUM_PARENT_NOTE_ID` | No | `root/Memory` | Root note in Trilium |
| `TRILIUM_API_URL` | Yes | - | TriliumNext etapi URL (e.g., https://YOUR-SERVER.com/etapi) |
| `TRILIUM_API_TOKEN` | Yes | - | Trilium API token |
| `TRILIUM_ENABLE_SSL_VERIFY` | No | `false` | Enable SSL certificate verification (set to `true` if using trusted CA) |
| `TRILIUM_SYNC_ON_SESSION_END` | No | `true` | Sync on session end |
| `TRILIUM_SYNC_ON_BACKGROUND_REVIEW` | No | `true` | Sync on background review |
| `TRILIUM_SYNC_DELAY_MS` | No | `5000` | Debounce delay (ms) |
| `TRILIUM_CREATE_HIERARCHY` | No | `true` | Auto-create folders |
| `TRILIUM_INCLUDE_SOURCE_INFO` | No | `true` | Add metadata comments |

---

## Common Issues

### "MCP tool not found" Error

**Cause:** Server name mismatch

**Solution:**
1. Check `TRILIUM_SERVER_NAME` matches your MCP config
2. Verify the server is running
3. Check the tool names in `mcp-cache.json`

### "Trilium server not reachable" Error

**Cause:** Server URL or token incorrect

**Solution:**
1. Verify `TRILIUM_BASE` in your MCP config
2. Check `TRILIUM_TOKEN` is valid
3. Ensure network connectivity to Trilium server

### Notes Not Appearing

**Cause:** Sync not triggered or hierarchy missing

**Solution:**
1. Complete a session (don't just close Pi)
2. Check Pi logs for sync messages
3. Verify `root/Memory/` folder exists in Trilium

---

## Verification

### Check Server Configuration

```bash
# Check MCP config
cat ~/.pi/agent/mcp.json

# Check extension is loaded
pi exec --list | grep trilium
```

### Test Sync Manually

```bash
pi
/trilium-sync
# Check Trilium for notes
```

---

## Debug Mode

Enable verbose logging:

```bash
export DEBUG="pi-hermes-memory-trilium*"
```

Check Pi logs:

```bash
tail -f ~/.pi/agent/logs/*.log | grep "trilium"
```
