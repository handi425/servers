# Obsidian Finder MCP Server

A Model Context Protocol (MCP) server for interacting with Obsidian vaults. Provides tools for managing notes and vault structure.

## Features

- **Create Note**: Create new markdown notes with optional YAML frontmatter
- **Edit Note**: Modify existing notes while preserving metadata
- **Search Notes**: Full-text search across notes with frontmatter support
- **List Notes**: Get directory structure of vault
- **Delete Note**: Remove notes from vault
- **Move Note**: Rename or move notes within vault
- **Get Metadata**: Extract YAML frontmatter from notes
- **Get Vault Structure**: View hierarchical structure of vault

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Build the server:
```bash
npm run build
```

## Configuration

Set the following environment variables:

- `OBSIDIAN_VAULT_PATH`: Path to your Obsidian vault

## Usage

Start the server:
```bash
node build/index.js
```

The server will expose the following tools:

### create_note
Create a new note in the vault

**Parameters:**
- `path`: Path to note relative to vault root
- `content`: Note content in markdown format
- `metadata`: Optional YAML frontmatter metadata

### edit_note
Edit an existing note

**Parameters:**
- `path`: Path to note relative to vault root
- `content`: New note content
- `updateMetadata`: Whether to preserve existing frontmatter

### search_notes
Search for content in notes

**Parameters:**
- `query`: Search query
- `includeFrontmatter`: Include frontmatter in search
- `caseSensitive`: Case sensitive search

### list_notes
List markdown files in vault

**Parameters:**
- `path`: Optional subfolder path
- `recursive`: List files recursively

### delete_note
Delete a note

**Parameters:**
- `path`: Path to note relative to vault root

### move_note
Move or rename a note

**Parameters:**
- `oldPath`: Current path
- `newPath`: New path

### get_metadata
Get YAML frontmatter from note

**Parameters:**
- `path`: Path to note relative to vault root

### get_vault_structure
Get hierarchical structure of vault

**Parameters:**
- `path`: Optional subfolder path to start from

## License
MIT
