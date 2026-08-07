# Host Note Hierarchy Changes

## Summary
Modified `pi-hermes-memory-trilium.js` to create a two-level hierarchy for memory notes in Trilium:

```
/pi-hermes-memory/
  └── <hostname>/
      ├── <note-id-1>
      ├── <note-id-2>
      └── ...
```

## Changes Made

1. **Added hostname detection** (line 18-21):
   - Uses `os.hostname()` to get the machine's hostname
   - Defines `TOP_LEVEL_NOTE_TITLE = "pi-hermes-memory"`
   - Defines `HOST_NOTE_TITLE = HOSTNAME`

2. **Added `getOrCreateTopLevelNote()` function**:
   - Creates or finds the top-level "pi-hermes-memory" note under root
   - Returns the note ID for use as parent

3. **Added `getOrCreateHostNote()` function**:
   - Creates or finds the host-specific note under "pi-hermes-memory"
   - Uses the hostname as the note title
   - Returns the note ID for memory note parents

4. **Updated `syncToTrilium()` function**:
   - Now calls `getOrCreateHostNote()` before syncing
   - Uses the host note ID as the parent for all memory notes
   - Updates orphan note detection to search under the host note

## How It Works

On first sync:
1. Extension checks if "pi-hermes-memory" note exists under root
2. If not, creates it
3. Checks if hostname note (e.g., "spark-3a8f") exists under pi-hermes-memory
4. If not, creates it
5. All memory notes (from MEMORY.md, USER.md, failures.md) are created under the host note

## Benefits

- **Organized by host**: Each machine's memory notes are separated
- **Clear hierarchy**: Easy to understand structure
- **Automatic setup**: No manual note creation required
- **Backward compatible**: Existing notes are still found and archived properly

## Example Structure for Host "spark-3a8f"

```
/pi-hermes-memory/
  └── spark-3a8f/
      ├── 2024-08-06-memory-entry
      ├── 2024-08-07-user-preference
      └── 2024-08-07-failure-event
```
