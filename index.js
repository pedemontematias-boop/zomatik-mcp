let tareaPendiente = null;

// Endpoint para que la extensión de tu Chromebook consulte si hay tareas
app.get("/obtener-tarea", (req, res) => {
  if (tareaPendiente) {
    const tarea = tareaPendiente;
    tareaPendiente = null; // Limpiar la cola tras entregarla
    return res.json({ tarea });
  }
  res.json({ tarea: null });
});

// Dentro del manejador MCP cuando Spark te habla:
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "ejecutar_tarea_zomatik") {
    const args = request.params.arguments;
    
    // Guardar la orden para que la extensión de tu Chromebook la ejecute en tu pantalla
    tareaPendiente = {
      campo: args.campo_selector,
      valor: args.valor_texto,
      boton: args.boton_selector
    };

    return {
      content: [{ type: "text", text: "Orden enviada a tu Chromebook. Se ejecutará en la pestaña abierta de Zomatik." }]
    };
  }
});
