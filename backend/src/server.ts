import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
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

const uploadDir = path.join(process.cwd(), 'uploads', 'plans');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  }
})
const upload = multer({ storage: storage })

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

app.put('/api/spaces/:id', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Valid name is required' });
  }
  
  try {
    const space = await prisma.space.update({
      where: { id: req.params.id },
      data: { name: name.trim() }
    });
    res.json(space);
  } catch (error) {
    console.error('Error updating space:', error);
    res.status(500).json({ error: 'Failed to update space' });
  }
});

app.post('/api/spaces', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Valid name is required' });
  }
  
  // Генерация уникального цвета (0-360)
  const randomHue = Math.floor(Math.random() * 360);
  
  try {
    const space = await prisma.space.create({
      data: { 
        name: name.trim(),
        colorHue: randomHue
      }
    });
    res.status(201).json(space);
  } catch (error) {
    console.error('Error creating space:', error);
    res.status(500).json({ error: 'Failed to create space' });
  }
});

app.get('/api/spaces/:spaceId/cells', async (req, res) => {
  try {
    const cells = await prisma.cell.findMany({
      where: { spaceId: req.params.spaceId },
      include: { children: true },
      orderBy: { createdAt: 'asc' }
    });
    // Форматируем id для фронтенда
    const formattedCells = cells.map(c => {
      let parsedChecklist = null;
      if (c.checklist) {
        try { parsedChecklist = JSON.parse(c.checklist); } catch(e) { parsedChecklist = c.checklist; }
      }
      return {
        ...c,
        formattedId: `OM-${c.id}`,
        checklist: parsedChecklist
      };
    });
    res.json(formattedCells);
  } catch (error) {
    console.error('Error fetching cells:', error);
    res.status(500).json({ error: 'Failed to fetch cells' });
  }
});

app.get('/api/cells/in-progress', async (req, res) => {
  try {
    const cells = await prisma.cell.findMany({
      where: { state: 'In Progress' },
      include: { space: true },
      orderBy: { createdAt: 'asc' }
    });
    
    const formattedCells = cells.map(c => {
      let parsedChecklist = null;
      if (c.checklist) {
        try { parsedChecklist = JSON.parse(c.checklist); } catch(e) { parsedChecklist = c.checklist; }
      }
      return {
        ...c,
        formattedId: `OM-${c.id}`,
        checklist: parsedChecklist
      };
    });
    res.json(formattedCells);
  } catch (error) {
    console.error('Error fetching in-progress cells:', error);
    res.status(500).json({ error: 'Failed to fetch cells' });
  }
});
app.post('/api/spaces/:spaceId/cells', async (req, res) => {
  const { title, parentId } = req.body;
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Valid title is required' });
  }
  
  try {
    const cell = await prisma.cell.create({
      data: { 
        title: title.trim(),
        spaceId: req.params.spaceId,
        parentId: parentId ? parseInt(parentId, 10) : undefined,
        state: 'Idea' // Значение по умолчанию
      },
      include: { children: true }
    });
    res.status(201).json({
      ...cell,
      formattedId: `OM-${cell.id}`
    });
  } catch (error: any) {
    console.error('Error creating cell:', error);
    res.status(500).json({ error: 'Failed to create cell', details: error?.message || String(error) });
  }
});

app.put('/api/cells/:id', async (req, res) => {
  const { title, description, checklist, assignee, deadline, state, implementationPlan, completionReport, parentId } = req.body;
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Valid title is required' });
  }

  // Валидация перехода в состояние 'Ready to Work'
  if (state === 'Ready to Work') {
    // Нам нужно проверить текущие данные ячейки, если часть данных не передана,
    // но для упрощения: предполагаем, что фронтенд присылает все поля, либо
    // проверяем наличие полей в БД. Чтобы было надежно - сначала читаем ячейку.
    try {
      const existingCell = await prisma.cell.findUnique({ where: { id: parseInt(req.params.id, 10) } });
      if (existingCell) {
        const finalDesc = description !== undefined ? description : existingCell.description;
        const finalChecklist = checklist !== undefined ? checklist : existingCell.checklist;
        const finalAssignee = assignee !== undefined ? assignee : existingCell.assignee;
        const finalDeadline = deadline !== undefined ? deadline : existingCell.deadline;
        
        if (!finalDesc || !finalChecklist || !finalAssignee || !finalDeadline) {
          return res.status(400).json({ error: 'Missing required fields for Ready to Work state' });
        }
      }
    } catch(err) {
      // Игнорируем ошибку чтения, пусть упадет при апдейте если что
    }
  }
  
  try {
    const cell = await prisma.cell.update({
      where: { id: parseInt(req.params.id, 10) },
      data: { 
        title: title.trim(),
        description: description !== undefined ? description : undefined,
        checklist: checklist !== undefined ? (typeof checklist === 'object' ? JSON.stringify(checklist) : checklist) : undefined,
        assignee: assignee !== undefined ? assignee : undefined,
        deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : undefined,
        implementationPlan: implementationPlan !== undefined ? implementationPlan : undefined,
        completionReport: completionReport !== undefined ? completionReport : undefined,
        parentId: parentId !== undefined ? (parentId ? parseInt(parentId, 10) : null) : undefined,
        state: state !== undefined ? state : undefined
      },
      include: { children: true }
    });
    
    // Проверка статусов для Эпика
    if (cell.parentId) {
      const parent = await prisma.cell.findUnique({
        where: { id: cell.parentId },
        include: { children: true }
      });
      if (parent) {
        const allDone = parent.children.length > 0 && parent.children.every(c => c.state === 'Done');
        if (allDone && parent.state !== 'Review' && parent.state !== 'Done') {
          await prisma.cell.update({
            where: { id: parent.id },
            data: { state: 'Review' }
          });
        }
      }
    }
    
    // Parse checklist before sending response
    const responseCell = { ...cell } as any;
    if (responseCell.checklist) {
      try { responseCell.checklist = JSON.parse(responseCell.checklist); } catch(e) {}
    }
    res.json(responseCell);
  } catch (error: any) {
    console.error('Error updating cell:', error);
    res.status(500).json({ error: 'Failed to update cell', details: error?.message || String(error) });
  }
});

app.delete('/api/cells/:id', async (req, res) => {
  try {
    await prisma.cell.delete({
      where: { id: parseInt(req.params.id, 10) }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting cell:', error);
    res.status(500).json({ error: 'Failed to delete cell' });
  }
});

app.post('/api/cells/upload-plan', upload.single('planFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  try {
    const content = fs.readFileSync(req.file.path, 'utf8');
    res.json({ content, filename: req.file.filename });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read file' });
  }
});

app.post('/api/cells/upload-report', upload.single('reportFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  try {
    const content = fs.readFileSync(req.file.path, 'utf8');
    res.json({ content, filename: req.file.filename });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read file' });
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
