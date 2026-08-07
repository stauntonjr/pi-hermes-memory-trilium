#!/usr/bin/env node
/**
 * Pi-hermes-memory-trilium Extension
 *
 * Adds Trilium sync capabilities to pi-hermes-memory
 *
 * Features:
 * - Automatic sync on session end
 * - Manual sync command
 * - Content change detection
 * - Debounced sync to prevent rapid updates
 */
/**
 * This extension uses the TriliumNext etapi directly via Python
 * to sync memory files to Trilium. This avoids the complexity
 * of trying to call MCP tools through Pi's extension API.
 */
import { execSync } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
/**
 * Sync memory files to Trilium using Python
 */
async function syncToTrilium() {
    try {
        // Get config from environment
        const enabled = process.env.TRILIUM_SYNC_ENABLED !== "false";
        const serverName = process.env.TRILIUM_SERVER_NAME || "triliumnext-md-srv";
        const parentNoteId = process.env.TRILIUM_PARENT_NOTE_ID || "root/Memory";
        const syncDelayMs = parseInt(process.env.TRILIUM_SYNC_DELAY_MS || "5000", 10);
        if (!enabled) {
            console.log("[pi-hermes-memory-trilium] Trilium sync disabled");
            return;
        }
        // Call Python script to sync
        const pythonScript = path.join(__dirname, "sync.py");
        const args = [
            `--server-name=${serverName}`,
            `--parent-note-id=${parentNoteId}`,
            `--sync-delay-ms=${syncDelayMs}`
        ];
        execSync(`python3 ${pythonScript} ${args.join(" ")}`, {
            stdio: "inherit",
            env: process.env
        });
    }
    catch (error) {
        console.error("[pi-hermes-memory-trilium] Sync failed:", error.message);
    }
}
/**
 * Main extension entry point
 */
export default function (pi) {
    // Check if Trilium is enabled
    const enabled = process.env.TRILIUM_SYNC_ENABLED !== "false";
    if (!enabled) {
        console.log("[pi-hermes-memory-trilium] Trilium sync disabled in config");
        return;
    }
    console.log("[pi-hermes-memory-trilium] Extension loaded");
    // Register manual sync command
    pi.registerCommand("trilium-sync", {
        description: "Manually trigger Trilium sync",
        handler: async (_args, _ctx) => {
            await syncToTrilium();
        }
    });
    // Register sync on session end
    pi.on("session_shutdown", async (_event, _ctx) => {
        await syncToTrilium();
    });
}
//# sourceMappingURL=index.js.map