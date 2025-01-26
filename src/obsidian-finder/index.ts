#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { ObsidianTools } from './lib/tools.js';
import { ObsidianError, CreateNoteOptions, EditNoteOptions, SearchOptions, MoveNoteOptions } from './lib/types.js';

const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH;
if (!VAULT_PATH) {
  throw new Error('OBSIDIAN_VAULT_PATH environment variable is required');
}

function validateCreateNoteArgs(args: Record<string, unknown>): CreateNoteOptions {
  if (typeof args.path !== 'string' || typeof args.content !== 'string') {
    throw new McpError(ErrorCode.InvalidRequest, 'Invalid create_note arguments');
  }
  return {
    path: args.path,
    content: args.content,
    metadata: args.metadata as Record<string, unknown>,
  };
}

function validateEditNoteArgs(args: Record<string, unknown>): EditNoteOptions {
  if (typeof args.path !== 'string' || typeof args.content !== 'string') {
    throw new McpError(ErrorCode.InvalidRequest, 'Invalid edit_note arguments');
  }
  return {
    path: args.path,
    content: args.content,
    updateMetadata: args.updateMetadata as boolean,
  };
}

function validateSearchArgs(args: Record<string, unknown>): SearchOptions {
  if (typeof args.query !== 'string') {
    throw new McpError(ErrorCode.InvalidRequest, 'Invalid search_notes arguments');
  }
  return {
    query: args.query,
    includeFrontmatter: args.includeFrontmatter as boolean,
    caseSensitive: args.caseSensitive as boolean,
  };
}

function validateMoveNoteArgs(args: Record<string, unknown>): MoveNoteOptions {
  if (typeof args.oldPath !== 'string' || typeof args.newPath !== 'string') {
    throw new McpError(ErrorCode.InvalidRequest, 'Invalid move_note arguments');
  }
  return {
    oldPath: args.oldPath,
    newPath: args.newPath,
  };
}

function validateVaultStructureArgs(args: Record<string, unknown>): { path?: string } {
  if (args.path && typeof args.path !== 'string') {
    throw new McpError(ErrorCode.InvalidRequest, 'Invalid get_vault_structure arguments');
  }
  return {
    path: args.path as string | undefined,
  };
}

class ObsidianServer {
  private server: Server;
  private tools: ObsidianTools;

  constructor() {
    if (!VAULT_PATH) {
      throw new Error('OBSIDIAN_VAULT_PATH is required');
    }
    this.tools = new ObsidianTools(VAULT_PATH);
    this.server = new Server(
      {
        name: 'obsidian-finder',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.server.onerror = (error) => console.error('[MCP Error]', error);
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'create_note',
          description: 'Create a new note in the Obsidian vault',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the note relative to vault root',
              },
              content: {
                type: 'string',
                description: 'Note content in markdown format',
              },
              metadata: {
                type: 'object',
                description: 'Optional YAML frontmatter metadata',
              },
            },
            required: ['path', 'content'],
          },
        },
        {
          name: 'edit_note',
          description: 'Edit an existing note in the Obsidian vault',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the note relative to vault root',
              },
              content: {
                type: 'string',
                description: 'New note content in markdown format',
              },
              updateMetadata: {
                type: 'boolean',
                description: 'Whether to preserve existing frontmatter',
              },
            },
            required: ['path', 'content'],
          },
        },
        {
          name: 'search_notes',
          description: 'Search for content in notes',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
              includeFrontmatter: {
                type: 'boolean',
                description: 'Include frontmatter in search',
              },
              caseSensitive: {
                type: 'boolean',
                description: 'Case sensitive search',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'list_notes',
          description: 'List markdown files in vault',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Subfolder path relative to vault root',
              },
              recursive: {
                type: 'boolean',
                description: 'List files recursively',
              },
            },
          },
        },
        {
          name: 'delete_note',
          description: 'Delete a note from the vault',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the note relative to vault root',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'move_note',
          description: 'Move or rename a note',
          inputSchema: {
            type: 'object',
            properties: {
              oldPath: {
                type: 'string',
                description: 'Current path relative to vault root',
              },
              newPath: {
                type: 'string',
                description: 'New path relative to vault root',
              },
            },
            required: ['oldPath', 'newPath'],
          },
        },
        {
          name: 'get_metadata',
          description: 'Get YAML frontmatter metadata from a note',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the note relative to vault root',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'get_vault_structure',
          description: 'Get hierarchical structure of the Obsidian vault',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Optional subfolder path to start from',
              },
            },
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        if (!request.params.arguments) {
          throw new McpError(ErrorCode.InvalidRequest, 'Arguments are required');
        }

        const args = request.params.arguments as Record<string, unknown>;

        switch (request.params.name) {
          case 'create_note': {
            const validatedArgs = validateCreateNoteArgs(args);
            const note = await this.tools.createNote(validatedArgs);
            return {
              content: [{ type: 'text', text: JSON.stringify(note, null, 2) }],
            };
          }

          case 'edit_note': {
            const validatedArgs = validateEditNoteArgs(args);
            const note = await this.tools.editNote(validatedArgs);
            return {
              content: [{ type: 'text', text: JSON.stringify(note, null, 2) }],
            };
          }

          case 'search_notes': {
            const validatedArgs = validateSearchArgs(args);
            const results = await this.tools.searchNotes(validatedArgs);
            return {
              content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
            };
          }

          case 'list_notes': {
            const files = await this.tools.listNotes(args);
            return {
              content: [{ type: 'text', text: JSON.stringify(files, null, 2) }],
            };
          }

          case 'delete_note': {
            if (typeof args.path !== 'string') {
              throw new McpError(ErrorCode.InvalidRequest, 'Invalid delete_note arguments');
            }
            await this.tools.deleteNote(args.path);
            return {
              content: [{ type: 'text', text: 'Note deleted successfully' }],
            };
          }

          case 'move_note': {
            const validatedArgs = validateMoveNoteArgs(args);
            await this.tools.moveNote(validatedArgs);
            return {
              content: [{ type: 'text', text: 'Note moved successfully' }],
            };
          }

          case 'get_metadata': {
            if (typeof args.path !== 'string') {
              throw new McpError(ErrorCode.InvalidRequest, 'Invalid get_metadata arguments');
            }
            const metadata = await this.tools.getMetadata(args.path);
            return {
              content: [{ type: 'text', text: JSON.stringify(metadata, null, 2) }],
            };
          }

          case 'get_vault_structure': {
            const validatedArgs = validateVaultStructureArgs(args);
            const structure = await this.tools.getVaultStructure(validatedArgs.path);
            return {
              content: [{ type: 'text', text: JSON.stringify(structure, null, 2) }],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (error instanceof ObsidianError) {
          throw new McpError(ErrorCode.InvalidRequest, error.message);
        }
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Obsidian MCP server running on stdio');
  }
}

const server = new ObsidianServer();
server.run().catch(console.error);
