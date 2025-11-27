const express = require('express');
const net = require('net');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

// --- IMPORTACIONES DE AUDIO (ICE) ---
const iceClient = require('./services/IceClient');
const callbackServer = require('./services/IceCallbackServer');
const { setFrontendNotifier } = require('./config/ice');

const app = express();
app.use(cors());

// Aumentamos límite para audios en Base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const port = 3001;
const serverPort = 5000;
const serverIp = "localhost";

// Creamos el servidor HTTP y adjuntamos el WebSocket Server a él
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const connectedUsers = new Map();
const mediaConnections = new Map();

wss.on('connection', (ws, req) => { //Req pa obtener url del ws
  console.log('[WS] Cliente conectado');

  const urlParts = req.url ? req.url.split('/') : [];
  const isMediaConnection = urlParts[1] === 'call_media';
  const sessionId = urlParts[2];

  if (isMediaConnection && sessionId) {
    // --- MANEJO DE CONEXIÓN DE MEDIOS

    if (!mediaConnections.has(sessionId)) {
      mediaConnections.set(sessionId, new Set());
    }
    mediaConnections.get(sessionId).add(ws);
    ws.sessionId = sessionId;

    console.log(`[WS MEDIA] Cliente conectado para sesión ${sessionId}. Total: ${mediaConnections.get(sessionId).size}`);

    ws.on('message', (message) => {
      // 2. Lógica de Enrutamiento de Medios
      const sessionClients = mediaConnections.get(sessionId);
      if (sessionClients) {
        sessionClients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
    });

    ws.on('close', () => {
      const sessionClients = mediaConnections.get(sessionId);
      if (sessionClients) {
        sessionClients.delete(ws);
        console.log(`[WS MEDIA] Cliente desconectado de sesión ${sessionId}. Restantes: ${sessionClients.size}`);
        if (sessionClients.size === 0) {
          mediaConnections.delete(sessionId);
          console.log(`[WS MEDIA] Sesión ${sessionId} cerrada.`);
        }
      }
    });

    return;
  }

  // --- 3. MANEJO DE CONEXIÓN DE SEÑALIZACIÓN (EXISTENTE) ---

  ws.on('message', async (message) => {
    try {
      const parsedMsg = JSON.parse(message);

      if (parsedMsg.type === 'register_ws') {
        const userId = parsedMsg.userId;

        // Guardar conexión WebSocket
        connectedUsers.set(userId, ws);
        ws.userId = userId;

        console.log(`[WS] Usuario registrado: ${userId}`);

        try {
          const success = await callbackServer.registerUserForCallbacks(userId);

          if (success) {
            console.log(`[WS-ICE] Callback registrado exitosamente para ${userId}`);
            // Notificar éxito al frontend
            ws.send(JSON.stringify({
              type: 'ice_registration_success',
              data: { userId }
            }));
          } else {
            console.warn(`[WS-ICE] Callback NO registrado para ${userId}`);
            ws.send(JSON.stringify({
              type: 'ice_registration_warning',
              data: {
                userId,
                message: 'Servicio de audio no disponible, algunas funciones estarán limitadas'
              }
            }));
          }
        } catch (iceError) {
          console.error(`[WS-ICE] Error crítico en registro para ${userId}:`, iceError);
          // No romper la conexión WebSocket por error ICE
          ws.send(JSON.stringify({
            type: 'ice_error',
            data: {
              message: 'Error en servicio de audio',
              recoverable: true
            }
          }));
        }
      }

    } catch (e) {
      console.error("[WS] Mensaje inválido recibido:", e.message);
    }
  });

  ws.on('close', () => {
    if (ws.userId) {
      const userId = ws.userId;
      connectedUsers.delete(userId);

      // Desregistrar callbacks ICE
      callbackServer.unregisterUserForCallbacks(userId)
          .catch(err => console.error(`[WS-ICE] Error desregistrando ${userId}:`, err));

      console.log(`[WS] Usuario desconectado: ${userId}`);
    }
  });
});

// Endpoint para verificar estado ICE
app.get("/ice-status", (req, res) => {
  const status = callbackServer.getStatus();
  res.json({
    status: "ok",
    ice: status,
    timestamp: new Date().toISOString()
  });
});

// Esta función se ejecuta cuando Java nos manda una notificación
setFrontendNotifier((userId, eventName, data) => {
  const ws = connectedUsers.get(userId);

  // Verificamos que el usuario tenga conexión y esté abierta (OPEN = 1)
  if (ws && ws.readyState === WebSocket.OPEN) {
    const payload = JSON.stringify({
      type: eventName, // 'incoming_call', 'voice_message', etc.
      data: data
    });

    ws.send(payload);
    console.log(`[WS-PUSH] Enviado '${eventName}' a ${userId}`);
  } else {
    // console.warn(`[WS-PUSH] Usuario ${userId} no conectado.`);
  }
});


// =========================================================================
// 2. ENDPOINTS ORIGINALES TCP (INTACTOS)

app.post("/users", (req, res) => {
  const userData = req.body;
  const socket = new net.Socket();
  socket.connect(serverPort, serverIp, () => {
    const message = JSON.stringify({ action: "register_user", data: userData });
    console.log("Enviando al servidor TCP:", message);
    socket.write(message + "\n");
  });
  socket.on("data", (data) => {
    try {
      const response = JSON.parse(data.toString());
      res.json(response);
      socket.end();
    } catch (err) {
      res.status(500).json({ status: "error", body: "Respuesta inválida TCP" });
      socket.destroy();
    }
  });
  socket.on("error", (err) => {
    res.status(500).json({ status: "error", body: "Error TCP" });
  });
});

app.get("/users", (req, res) => {
  const socket = new net.Socket();
  socket.connect(serverPort, serverIp, () => {
    const message = JSON.stringify({ action: "get_online_users" });
    socket.write(message + "\n");
  });
  socket.on("data", (data) => {
    try {
      const response = JSON.parse(data.toString());
      res.json(response);
      socket.end();
    } catch (err) {
      res.status(500).json({ status: "error", body: "Respuesta inválida TCP" });
    }
  });
  socket.on("error", (err) => { res.status(500).json({ status: "error" }); });
});

app.get("/groups", (req, res) => {
  const username = req.query.username;
  const userData = { username };
  const socket = new net.Socket();
  socket.connect(serverPort, serverIp, () => {
    const message = JSON.stringify({ action: "get_user_groups", data: userData });
    socket.write(message + "\n");
  });
  socket.on("data", (data) => {
    try {
      const response = JSON.parse(data.toString());
      res.json(response);
      socket.end();
    } catch (err) { res.status(500).json({ status: "error" }); }
  });
  socket.on("error", (err) => { res.status(500).json({ status: "error" }); });
});

app.post("/create-group", (req, res) => {
  const groupData = req.body;
  const socket = new net.Socket();
  socket.connect(serverPort, serverIp, () => {
    const message = JSON.stringify({ action: "create_group", data: groupData });
    socket.write(message + "\n");
  });
  socket.on("data", (data) => {
    try {
      const response = JSON.parse(data.toString());
      res.json(response);
      socket.end();
    } catch (err) { res.status(500).json({ status: "error" }); }
  });
  socket.on("error", (err) => { res.status(500).json({ status: "error" }); });
});

app.post("/add_text", (req, res) => {
  const messageData = req.body;
  const socket = new net.Socket();
  socket.connect(serverPort, serverIp, () => {
    const message = JSON.stringify({ action: "add_text", data: messageData });
    socket.write(message + "\n");
  });
  socket.on("data", (data) => {
    try {
      const response = JSON.parse(data.toString());
      res.json(response);
      socket.end();
    } catch (err) { res.status(500).json({ status: "error" }); }
  });
  socket.on("error", (err) => { res.status(500).json({ status: "error" }); });
});

app.get("/get_messages", (req, res) => {
  const sender = req.query.sender;
  const receiver = req.query.receiver;
  const data = { sender, receiver };
  const socket = new net.Socket();
  socket.connect(serverPort, serverIp, () => {
    const message = JSON.stringify({ action: "get_messages", data: data });
    socket.write(message + "\n");
  });
  socket.on("data", (data) => {
    try {
      const response = JSON.parse(data.toString());
      res.json(response);
      socket.end();
    } catch (err) { res.status(500).json({ status: "error" }); }
  });
  socket.on("error", (err) => { res.status(500).json({ status: "error" }); });
});

app.put("/users/status", (req, res) => {
  const userData = req.body;
  const socket = new net.Socket();
  socket.connect(serverPort, serverIp, () => {
    const message = JSON.stringify({ action: "logout_user", data: userData });
    socket.write(message + "\n");
  });
  socket.on("data", (data) => {
    try {
      const response = JSON.parse(data.toString());
      res.json(response);
      socket.end();
    } catch (err) { res.status(500).json({ status: "error" }); }
  });
  socket.on("error", (err) => { res.status(500).json({ status: "error" }); });
});


// =========================================================================
// 3. NUEVOS ENDPOINTS PARA AUDIO Y LLAMADAS (ICE)
// =========================================================================

app.get("/get_audio_file/:id", async (req, res) => {
  const messageId = req.params.id;
  try {
    const audioBytes = await iceClient.getVoiceMessage(messageId);
    if (!audioBytes || audioBytes.length === 0) return res.status(404).send("Audio not found");

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', audioBytes.length);
    res.send(audioBytes);

  } catch (error) {
    console.error("Error retrieving audio:", error);
    res.status(500).send("Error retrieving audio file");
  }
});

app.post("/send_audio", async (req, res) => {
  const { sender, receiver, audioData } = req.body;
  if (!audioData) return res.status(400).json({status: "error", message: "Missing audioData"});

  try {
    const audioBuffer = Buffer.from(audioData, 'base64');
    const messageId = await iceClient.sendVoiceMessage(sender, receiver, audioBuffer);
    res.json({ status: "ok", messageId: messageId });
  } catch (err) {
    console.error("Error sending audio:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.post("/start_call", async (req, res) => {
  const { callerId, targetId } = req.body;
  try {
    const callInfo = await iceClient.startCall(callerId, targetId);
    res.json({ status: "ok", data: callInfo });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.post("/join_call", async (req, res) => {
  const { userId, sessionId } = req.body;
  try {
    const callInfo = await iceClient.joinCall(userId, sessionId);
    res.json({ status: "ok", data: callInfo });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.post("/end_call", async (req, res) => {
  const { userId, sessionId } = req.body;
  try {
    await iceClient.endCall(userId, sessionId);
    res.json({ status: "ok" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.post("/record_audio", (req, res) => {
  res.status(400).json({ status: "warning", message: "Use /send_audio endpoint" });
});


app.get("/ice/debug", (req, res) => {
  const adapterInfo = callbackServer.getAdapterInfo();
  res.json({
    status: "ok",
    ice: adapterInfo,
    connectedUsers: Array.from(connectedUsers.keys()),
    timestamp: new Date().toISOString()
  });
});

// Modificar el inicio para verificar puertos
server.listen(port, () => {
  console.log(`Proxy HTTP + WS escuchando en http://localhost:${port}`);
  console.log(`ICE Configurado para conexión bidireccional sin endpoints`);

  // Inicialización ICE mejorada
  initializeICE();
});

async function initializeICE() {
  try {
    console.log('[ICE] Inicializando servicio ICE...');

    const iceClient = require('./services/IceClient');

    // Probar conexión básica
    const prx = await iceClient.getAudioServicePrx();

    // --- CORRECCIÓN VISUAL ---
    const prototype = Object.getPrototypeOf(prx);
    const methods = Object.getOwnPropertyNames(prototype)
        .filter(key =>
            typeof prx[key] === 'function' &&
            !key.startsWith('ice_') &&
            key !== 'constructor'
        );

    console.log('[ICE] Métodos detectados en el proxy:', methods);

    if (methods.includes('startCall')) {
      console.log('✅ ICE conectado correctamente y métodos validados.');
      console.log('ℹ️  Servicio de audio listo para usar.');
      return true;
    } else {
      console.warn('⚠️ Conexión establecida pero no veo los métodos esperados.');
      return false;
    }

  } catch (error) {
    console.log('❌ ICE no disponible:', error.message);
    console.log('ℹ️  Verifica que el servidor Java ICE esté ejecutándose en puerto 12000');
    return false;
  }
}

app.get("/ice/diagnostic", async (req, res) => {
  try {
    const iceClient = require('./services/IceClient');
    const iceStatus = await iceClient.checkHealth();
    const callbackStatus = require('./services/IceCallbackServer').getStatus();

    res.json({
      status: "ok",
      ice: iceStatus,
      callbacks: callbackStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// En Services.js - agregar endpoints de prueba
app.get("/ice/test", async (req, res) => {
  try {
    const iceClient = require('./services/IceClient');
    const testResults = await iceClient.testAllMethods();

    res.json({
      status: "ok",
      testResults: testResults,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para ver métodos disponibles
app.get("/ice/methods", async (req, res) => {
  try {
    const iceClient = require('./services/IceClient');
    const prx = await iceClient.getAudioServicePrx();

    const allMethods = Object.getOwnPropertyNames(prx)
        .filter(key => typeof prx[key] === 'function')
        .sort();

    const iceMethods = allMethods.filter(m => m.startsWith('ice_'));
    const customMethods = allMethods.filter(m => !m.startsWith('ice_'));

    res.json({
      status: "ok",
      methods: {
        total: allMethods.length,
        iceMethods: iceMethods,
        customMethods: customMethods
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
