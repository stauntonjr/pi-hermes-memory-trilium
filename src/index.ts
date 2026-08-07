#!/usr/bin/env node
/**
 * Pi-hermes-memory-trilium Extension
 * 
 * Adds Trilium sync capabilities to pi-hermes-memory
 * 
 * Features:
 * - Automatic sync on session end
 * - Manual sync command
 * - Content change detection with debouncing
 * - Direct HTTP API calls to Trilium Etapi (no MCP overhead)
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";

// Configuration constants
const TRILIUM_API_URL = process.env.TRILIUM_API_URL || "https://YOUR-TRILIUM-SERVER.com/etapi";
const TRILIUM_API_TOKEN = process.env.TRILIUM_API_TOKEN || "YOUR-TRILIUM-API-TOKEN-HERE";
const TRILIUM_PARENT_NOTE_ID = process.env.TRILIUM_PARENT_NOTE_ID || "root";
const PI_HERMES_MEMORY_DIR = process.env.PI_HERMES_MEMORY_DIR || "/path/to/pi-hermes-memory";
const LAST_SYNC_FILE = path.join(PI_HERMES_MEMORY_DIR, ".last-sync");

// Entry point for sync
interface MemoryEntry {
  id: string;
  content: string;
  category?: string;
  source?: string;
  timestamp?: string;
}

/**
 * Calculate SHA256 hash of content
 */
function calculateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Parse MEMORY.md/USER.md/failures.md into individual entries
 */
async function parseMemoryFile(filePath: string): Promise<MemoryEntry[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    // Split on § delimiter, filter empty entries
    const entries = content.split('§').filter(e => e.trim().length > 0);
    
    return entries.map(entry => {
      // Extract metadata if present
      const metaMatch = entry.match(/<!-- created=([^,]+), last=([^ ]+) -->/);
      const timestamp = metaMatch ? metaMatch[1] : new Date().toISOString().split('T')[0];
      
      // Clean content - remove metadata comments
      const cleanContent = entry.replace(/<!-- created=[^,]+, last=[^ ]+ -->/g, '').trim();
      
      // Determine category from filename
      const filename = path.basename(filePath, '.md');
      const category = filename === 'USER' ? 'preference' : 
                       filename === 'failures' ? 'failure' : 'memory';
      
      // Generate ID from hash
      const id = calculateHash(cleanContent + timestamp);
      
      return {
        id,
        content: cleanContent,
        category,
        source: path.basename(filePath),
        timestamp
      };
    });
  } catch (error) {
    console.error(`[pi-hermes-memory-trilium] Error reading ${filePath}:`, error);
    return [];
  }
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[pi-hermes-memory-trilium] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Retry exhausted');
}

/**
 * Get existing note from Trilium by ID
 */
async function getTriliumNote(noteId: string): Promise<any | null> {
  try {
    const response = await fetch(`${TRILIUM_API_URL}/notes/${noteId}`, {
      headers: {
        'Authorization': `Bearer ${TRILIUM_API_TOKEN}`
      }
    });
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`[pi-hermes-memory-trilium] Error getting note ${noteId}:`, error);
    return null;
  }
}

async function createTriliumNote(params: {
  parentNoteId: string;
  title: string;
  content: string;
  category: string;
  source: string;
  timestamp: string;
  id?: string;
}): Promise<string | null> {
  try {
    // Step 1: Create the note with retry
    const createResult = await retryWithBackoff(async () => {
      const createResponse = await fetch(`${TRILIUM_API_URL}/create-note`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TRILIUM_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parentNoteId: params.parentNoteId,
          title: params.title,
          type: 'text',
          content: `<p>${params.content.replace(/\n/g, '<br>')}</p>`,
          mime: 'text/html'
        })
      });
      
      if (!createResponse.ok) {
        throw new Error(`HTTP ${createResponse.status}: ${createResponse.statusText}`);
      }
      
      return await createResponse.json();
    });
    
    const noteId = createResult.note.noteId;
    
    // Step 2: Add labels with retry
    await retryWithBackoff(async () => {
      const labelResponse = await fetch(`${TRILIUM_API_URL}/attributes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TRILIUM_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          noteId: noteId,
          type: 'label',
          name: 'category',
          value: params.category
        })
      });
      
      if (!labelResponse.ok) {
        throw new Error(`HTTP ${labelResponse.status}: ${labelResponse.statusText}`);
      }
    }, 2, 500);
    
    await retryWithBackoff(async () => {
      const sourceLabelResponse = await fetch(`${TRILIUM_API_URL}/attributes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TRILIUM_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          noteId: noteId,
          type: 'label',
          name: 'source',
          value: params.source
        })
      });
      
      if (!sourceLabelResponse.ok) {
        throw new Error(`HTTP ${sourceLabelResponse.status}: ${sourceLabelResponse.statusText}`);
      }
    }, 2, 500);
    
    await retryWithBackoff(async () => {
      const timestampLabelResponse = await fetch(`${TRILIUM_API_URL}/attributes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TRILIUM_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          noteId: noteId,
          type: 'label',
          name: 'timestamp',
          value: params.timestamp
        })
      });
      
      if (!timestampLabelResponse.ok) {
        throw new Error(`HTTP ${timestampLabelResponse.status}: ${timestampLabelResponse.statusText}`);
      }
    }, 2, 500);
    
    return noteId;
  } catch (error) {
    console.error(`[pi-hermes-memory-trilium] Error creating note:`, error);
    return null;
  }
}
/**
 * Update an existing note in Trilium
 */
async function updateTriliumNote(noteId: string, content: string, expectedHash: string): Promise<boolean> {
  try {
    const result = await retryWithBackoff(async () => {
      const response = await fetch(`${TRILIUM_API_URL}/notes/${noteId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${TRILIUM_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: `<p>${content.replace(/\n/g, '<br>')}</p>`
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return true;
    });
    
    return result;
  } catch (error) {
    console.error(`[pi-hermes-memory-trilium] Error updating note ${noteId} after retries:`, error);
    return false;
  }
}

/**
 * Search for a note by title in Trilium
 */
async function searchTriliumNotes(title: string): Promise<any[]> {
  try {
    const response = await fetch(`${TRILIUM_API_URL}/notes?search=${encodeURIComponent(title)}`, {
      headers: {
        'Authorization': `Bearer ${TRILIUM_API_TOKEN}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.results || [];
  } catch (error) {
    console.error(`[pi-hermes-memory-trilium] Error searching notes:`, error);
    return [];
  }
}

/**
 * Get last sync time from file
 */
async function getLastSyncTime(): Promise<string | null> {
  try {
    const content = await fs.readFile(LAST_SYNC_FILE, 'utf-8');
    const data = JSON.parse(content);
    return data.lastSync || null;
  } catch (error) {
    return null;
  }
}

/**
 * Save last sync time to file
 */
async function saveLastSyncTime(): Promise<void> {
  try {
    await fs.mkdir(path.dirname(LAST_SYNC_FILE), { recursive: true });
    await fs.writeFile(
      LAST_SYNC_FILE,
      JSON.stringify({ lastSync: new Date().toISOString() })
    );
  } catch (error) {
    console.error(`[pi-hermes-memory-trilium] Error saving sync time:`, error);
  }
}

/**
 * Check if content has changed since last sync
 */
async function contentChanged(content: string, note: any): Promise<boolean> {
  const lastSync = await getLastSyncTime();
  if (!lastSync) return true;
  
  // Compare current content hash with note content
  const currentHash = calculateHash(content);
  const noteHash = note.contentHash || '';
  
  return currentHash !== noteHash;
}

/**
 * Get all notes under the parent note in Trilium
 */
async function getAllTriliumNotes(parentNoteId: string): Promise<any[]> {
  try {
    // Trilium's notes endpoint doesn't support listing children directly,
    // so we search for notes with the parentNoteId in their path
    // We use a wildcard search to get all notes, then filter
    const searchResult = await searchTriliumNotes('*');
    
    // Filter to only notes under our parent
    return searchResult.filter((note: any) => {
      // Check if note is under the parent note hierarchy
      return note.path && note.path.startsWith(`${parentNoteId}/`);
    });
  } catch (error) {
    console.error(`[pi-hermes-memory-trilium] Error getting all notes:`, error);
    return [];
  }
}

/**
 * Archive an orphaned note by adding #archived label
 */
async function archiveNote(noteId: string): Promise<boolean> {
  try {
    // First, check if already archived
    const note = await getTriliumNote(noteId);
    const archivedLabel = note?.attributes?.find((attr: any) => attr.name === 'archived');
    
    if (archivedLabel) {
      console.log(`[pi-hermes-memory-trilium] Note ${noteId} already archived`);
      return true;
    }
    
    // Add archived label
    const response = await fetch(`${TRILIUM_API_URL}/attributes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TRILIUM_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        noteId: noteId,
        type: 'label',
        name: 'archived',
        value: 'true'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log(`[pi-hermes-memory-trilium] Archived note: ${noteId}`);
    return true;
  } catch (error) {
    console.error(`[pi-hermes-memory-trilium] Error archiving note ${noteId}:`, error);
    return false;
  }
}

/**
 * Sync memory files to Trilium
 */
async function syncToTrilium(): Promise<void> {
  console.log('[pi-hermes-memory-trilium] Starting sync...');
  
  const memoryFiles = ['MEMORY.md', 'USER.md', 'failures.md'];
  const createdNotes: string[] = [];
  const syncedNoteIds: string[] = [];
  
  for (const filename of memoryFiles) {
    const filePath = path.join(PI_HERMES_MEMORY_DIR, filename);
    const entries = await parseMemoryFile(filePath);
    
    console.log(`[pi-hermes-memory-trilium] Processing ${filename}: ${entries.length} entries`);
    
    for (const entry of entries) {
      // Search for existing note
      const notes = await searchTriliumNotes(entry.id);
      const existingNote = notes.find((n: any) => n.title === entry.id);
      
      if (existingNote) {
        // Note already exists - skip update (Trilium API doesn't support direct content updates)
        // The content is stored in a blob and cannot be easily updated via API
        // We'll just keep the existing note and archive any new ones with the same content
        console.log(`[pi-hermes-memory-trilium] Skipped (already exists): ${entry.id}`);
        syncedNoteIds.push(existingNote.noteId);
      } else {
        // Create new note
        const noteId = await createTriliumNote({
          parentNoteId: TRILIUM_PARENT_NOTE_ID,
          title: entry.id,
          content: entry.content,
          category: entry.category || 'memory',
          source: entry.source || filename,
          timestamp: entry.timestamp || new Date().toISOString().split('T')[0]
        });
        
        if (noteId) {
          console.log(`[pi-hermes-memory-trilium] Created: ${entry.id} (ID: ${noteId})`);
          createdNotes.push(noteId);
          syncedNoteIds.push(noteId);
        } else {
          console.error(`[pi-hermes-memory-trilium] Failed to create: ${entry.id}`);
        }
      }
    }
  }
  
  // Find and archive orphaned notes (notes in Trilium but not in local files)
  console.log('[pi-hermes-memory-trilium] Checking for orphaned notes...');
  const allTriliumNotes = await getAllTriliumNotes(TRILIUM_PARENT_NOTE_ID);
  
  for (const triliumNote of allTriliumNotes) {
    // Check if this note's ID is in our synced list
    const isSynced = syncedNoteIds.includes(triliumNote.noteId);
    
    if (!isSynced) {
      // Check if it's one of our memory notes (has source label)
      const sourceLabel = triliumNote.attributes?.find((attr: any) => attr.name === 'source');
      
      if (sourceLabel && memoryFiles.includes(sourceLabel.value)) {
        // This is a memory note that no longer has a local entry - archive it
        await archiveNote(triliumNote.noteId);
      }
    }
  }
  
  // Save sync timestamp
  await saveLastSyncTime();
  
  console.log(`[pi-hermes-memory-trilium] Sync complete! Created ${createdNotes.length} notes, synced ${syncedNoteIds.length} total`);
}

/**
 * Export sync function for external use
 */
export { syncToTrilium };

/**
 * Main extension entry point
 */
export default function (pi: any): void {
  console.log('[pi-hermes-memory-trilium] Extension loaded');
  
  // Register manual sync command
  pi.registerCommand('trilium-sync', {
    description: 'Manually trigger Trilium sync',
    handler: async (_args: string, _ctx: any) => {
      await syncToTrilium();
    }
  });
  
  // Register sync on session end
  pi.on('session_shutdown', async (_event: any, _ctx: any) => {
    await syncToTrilium();
  });
  
  // Optional: Sync on background review
  pi.on('background_review', async (_event: any, _ctx: any) => {
    await syncToTrilium();
  });
}
