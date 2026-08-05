const express = require('express');
const cors = require('cors');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

const app = express();

// Habilitar CORS para permitir solicitudes desde cualquier origen (Spark/Gemini)
app.use(cors());
app.use(express.json());

// Variable para almacenar la orden
let tareaPendiente = null;

// Crear el servidor MCP
const server = new Server(
  { name: "zomatik-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Declarar la herramienta para Spark
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "ejecutar_tarea_zomatik",
        description: "Envía una instrucción visual a la extensión de Chrome para interactuar con Zomatik.",
        inputSchema: {
          type: "object",
          properties: {
            campo_selector: { type: "string", description: "Selector CSS del campo de texto" },
            valor_texto: { type: "string", description: "Texto a escribir" },
            boton_selector: { type: "string", description: "Selector CSS del botón a hacer clic" }
          }
        }
      }
    ]
  };
});

// Manejar la acción cuando Spark llama a la herramienta
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "ejecutar_tarea_zomatik") {
    const args = request.params.arguments;
    
    tareaPendiente = {
      campo: args.campo_selector || null,
      valor: args.valor_texto || null,
      boton: args.boton_selector || null
    };

    return {
      content: [{ type: "text", text: "Orden enviada con éxito a la extensión del Chromebook." }]
    };
  }
  throw new Error("Herramienta no encontrada");
});

// Endpoint de verificación inicial (Health check)
app.get("/", (req, res) => {
  res.send("Servidor MCP de Zomatik activo y funcionando.");
});

// Endpoint para que la extensión de Chrome descargue tareas
app.get("/obtener-tarea", (req, res) => {
  if (tareaPendiente) {
    const tarea = tareaPendiente;
    tareaPendiente = null;
    return res.json({ tarea });
  }
  res.json({ tarea: null });
});

// Protocolo MCP (SSE)
let transport;
app.get("/mcp", async (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("Transporte no inicializado");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor MCP ejecutándose en el puerto ${PORT}`);
});
