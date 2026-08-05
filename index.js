const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'mcp-version']
}));

app.use(express.json());

let tareaPendiente = null;

// Endpoint de prueba de salud
app.get('/', (req, res) => {
  res.send("Servidor MCP activo");
});

// Endpoint para descargar tareas desde el Chromebook
app.get('/obtener-tarea', (req, res) => {
  if (tareaPendiente) {
    const tarea = tareaPendiente;
    tareaPendiente = null;
    return res.json({ tarea });
  }
  res.json({ tarea: null });
});

// Definición de las herramientas MCP
const MCP_TOOLS = {
  tools: [
    {
      name: "ejecutar_tarea_zomatik",
      description: "Envía una instrucción visual a la extensión de Chrome para interactuar con Zomatik.",
      inputSchema: {
        type: "object",
        properties: {
          campo_selector: { type: "string", description: "Selector CSS del campo de texto" },
          valor_texto: { type: "string", description: "Texto a escribir en el campo" },
          boton_selector: { type: "string", description: "Selector CSS del botón a presionar" }
        }
      }
    }
  ]
};

// Handshake y endpoints SSE para MCP
app.get('/mcp', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Enviar mensaje inicial de conexión SSE
  const initEvent = {
    jsonrpc: "2.0",
    method: "mcp/init",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "zomatik-mcp", version: "1.0.0" }
    }
  };

  res.write(`event: endpoint\ndata: /messages\n\n`);
  res.write(`data: ${JSON.stringify(initEvent)}\n\n`);
});

app.post('/messages', (req, res) => {
  const { method, params, id } = req.body || {};

  if (method === "initialize") {
    return res.json({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "zomatik-mcp", version: "1.0.0" }
      }
    });
  }

  if (method === "tools/list") {
    return res.json({
      jsonrpc: "2.0",
      id,
      result: MCP_TOOLS
    });
  }

  if (method === "tools/call") {
    const args = params?.arguments || {};
    tareaPendiente = {
      campo: args.campo_selector || null,
      valor: args.valor_texto || null,
      boton: args.boton_selector || null
    };

    return res.json({
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text: "Orden enviada con éxito a la extensión del Chromebook." }]
      }
    });
  }

  res.json({ jsonrpc: "2.0", id, result: {} });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor MCP listo en puerto ${PORT}`);
});
