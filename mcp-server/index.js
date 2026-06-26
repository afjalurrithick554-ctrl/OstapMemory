#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5055/api';

const server = new Server(
  {
    name: 'ostapmemory-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper to fetch notebooks
async function getNotebooks() {
  const response = await axios.get(`${API_BASE_URL}/notebooks`);
  return response.data;
}

// Helper to get notebook sources and notes
async function getNotebookDetails(notebookId) {
  const sourcesRes = await axios.get(`${API_BASE_URL}/sources?notebook_id=${notebookId}`);
  const notesRes = await axios.get(`${API_BASE_URL}/notes?notebook_id=${notebookId}`);
  return {
    sources: sourcesRes.data,
    notes: notesRes.data,
  };
}

// Helper to chat with notebook
async function chatWithNotebook(notebookId, message) {
  const requestBody = {
    notebook_id: notebookId,
    message: message,
    mode: 'auto',
  };
  const response = await axios.post(`${API_BASE_URL}/chat/execute`, requestBody);
  return response.data;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_notebooks',
        description: 'Get a list of all notebooks in OstapMemory.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_notebook_details',
        description: 'Get detailed information about a notebook, including its sources and notes.',
        inputSchema: {
          type: 'object',
          properties: {
            notebook_id: {
              type: 'string',
              description: 'The ID of the notebook.',
            },
          },
          required: ['notebook_id'],
        },
      },
      {
        name: 'chat_with_notebook',
        description: 'Send a message to a notebook in OstapMemory and get a response from its AI.',
        inputSchema: {
          type: 'object',
          properties: {
            notebook_id: {
              type: 'string',
              description: 'The ID of the notebook.',
            },
            message: {
              type: 'string',
              description: 'The message or question to send to the notebook.',
            },
          },
          required: ['notebook_id', 'message'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case 'get_notebooks': {
        const notebooks = await getNotebooks();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(notebooks, null, 2),
            },
          ],
        };
      }
      case 'get_notebook_details': {
        const { notebook_id } = request.params.arguments;
        const details = await getNotebookDetails(notebook_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(details, null, 2),
            },
          ],
        };
      }
      case 'chat_with_notebook': {
        const { notebook_id, message } = request.params.arguments;
        const result = await chatWithNotebook(notebook_id, message);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error executing tool: ${error.message}\n${error.response?.data ? JSON.stringify(error.response.data) : ''}`,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('OstapMemory MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
