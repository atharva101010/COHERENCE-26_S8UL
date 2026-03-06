# FlowReach AI — Error Log

## Error #1
Phase: 0
Time: 2026-03-06
Error Message: `npm error gyp ERR! find VS Could not find any Visual Studio installation to use`
File: backend/package.json (better-sqlite3 dependency)
Cause: better-sqlite3 requires native compilation via node-gyp, but Visual Studio Build Tools not installed on this machine. Node v25.2.0 also lacks prebuilt binaries.
Fix Applied: Removed better-sqlite3, switched to Node.js built-in `node:sqlite` module (DatabaseSync from 'node:sqlite'). Updated db.js accordingly.
Status: ✅ Resolved
