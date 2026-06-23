import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });
const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/feedback', (req, res) => {
  const { element, comment } = req.body;
  if (!element || !comment) {
    return res.status(400).send('Missing data');
  }
  
  const logLine = `- [ ] **Элемент:** \`${element}\` -> **Комментарий:** ${comment}\n`;
  const feedbackPath = path.join(process.cwd(), 'UI_FEEDBACK.md');
  
  fs.appendFileSync(feedbackPath, logLine, 'utf8');
  res.status(200).send({ success: true });
});

app.get('/api/spaces', async (req, res) => {
  try {
    const spaces = await prisma.space.findMany({
      orderBy: { createdAt: 'asc' }
    });
    res.json(spaces);
  } catch (error) {
    console.error('Error fetching spaces:', error);
    res.status(500).json({ error: 'Failed to fetch spaces' });
  }
});

app.delete('/api/spaces/:id', async (req, res) => {
  try {
    await prisma.space.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting space:', error);
    res.status(500).json({ error: 'Failed to delete space' });
  }
});

app.post('/api/spaces', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Valid name is required' });
  }
  
  try {
    const space = await prisma.space.create({
      data: { name: name.trim() }
    });
    res.status(201).json(space);
  } catch (error) {
    console.error('Error creating space:', error);
    res.status(500).json({ error: 'Failed to create space' });
  }
});

app.get('/api/spaces/:spaceId/cards', async (req, res) => {
  try {
    const cards = await prisma.card.findMany({
      where: { spaceId: req.params.spaceId },
      orderBy: { createdAt: 'asc' }
    });
    // Форматируем id для фронтенда
    const formattedCards = cards.map(c => ({
      ...c,
      formattedId: `OM-${c.id}`
    }));
    res.json(formattedCards);
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

app.post('/api/spaces/:spaceId/cards', async (req, res) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Valid title is required' });
  }
  
  try {
    const card = await prisma.card.create({
      data: { 
        title: title.trim(),
        spaceId: req.params.spaceId,
        state: 'Idea' // Значение по умолчанию
      }
    });
    res.status(201).json({
      ...card,
      formattedId: `OM-${card.id}`
    });
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

const server = new Server(
  {
    name: "OstapMemory-Docker",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
    },
  }
);

const RULES_TEXT = `ИММУТАБЕЛЬНЫЕ ПРАВИЛА РАБОТЫ (IMMUTABLE RULES)
1. Агент может только читать данные. Любая модификация запрещена (Только чтение - это единственное правило).
2. Парадигма БД: Колонки — это не физические места, а лишь значение state в БД.
3. Изоляция логов: Отчеты читаются строго из секции AgentReports.
4. Ограничение: Агент не имеет прав на редактирование описания или чек-листа.
*Словосочетание "канбан-доска" исключено из документации и лексикона.*`;

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "rules://ostap-memory/immutable-rules",
        name: "Immutable Rules",
        mimeType: "text/plain",
        description: "Strict rules for AI agents interacting with OstapMemory Docker",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri === "rules://ostap-memory/immutable-rules") {
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "text/plain",
          text: RULES_TEXT,
        },
      ],
    };
  }
  throw new Error("Resource not found");
});

let transport: SSEServerTransport | null = null;

app.get('/mcp/sse', async (req, res) => {
  transport = new SSEServerTransport('/mcp/messages', res);
  await server.connect(transport);
});

app.post('/mcp/messages', async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('SSE transport not initialized');
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`MCP Server running on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/mcp/sse`);
});
