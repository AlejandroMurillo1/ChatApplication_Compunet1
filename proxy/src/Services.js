const express = require('express');
const net = require('net');
const cors = require('cors');
const { Buffer } = require('buffer'); // Necesario para manejar Base64/Bytes de audio
const http = require('http');
const WebSocket = require('ws');

// ----------------------------------------------------
// Importaciones de la Lógica ZeroC Ice
// (Asumiendo que estos archivos están en src/services y src/config)
// ----------------------------------------------------
// Si estas rutas no existen, el servidor fallará al iniciar.
const { registerCallback } = require('./services/IceCallbackServer');
const { requestCall, endCall, sendVoiceMessage } = require('./services/IceClient');

const app = express();
app.use(cors());
// CRÍTICO: Aumentar límite para buffers de voz (Base64 puede ser grande)
app.use(express.json({ limit: '5mb' }));

const port = 3001;
const serverPort = 5000;
const serverIp = "localhost";

// ========================================================
// === CONFIGURACIÓN DEL SERVIDOR HTTP Y WEBSOCKETS ===
// ========================================================

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Mapeo para asociar WebSocket con el ID de usuario (para notificaciones)
const clients = new Map();

wss.on('connection', (ws) => {
  console.log('[WS] Nuevo cliente conectado.');

  ws.on('message', (message) => {
    // El cliente envía su ID al conectar: { "type": "register", "clientID": "usuario1" }
    try {
      const data = JSON.parse(message);
      if (data.type === 'register' && data.clientID) {
        clients.set(data.clientID, ws);
        console.log(`[WS] Cliente ${data.clientID} registrado.`);

        // CRÍTICO: Registrar el callback de Ice para que el Java Server pueda llamarlo
        registerCallback(data.clientID).catch(err => {
          console.warn(`Advertencia: Fallo al registrar el callback para ${data.clientID}. ${err.message}`);
        });
      }
    } catch (e) {
      console.error('[WS Error] Error parsing client message:', e);
    }
  });

  ws.on('close', () => {
    clients.forEach((value, key) => {
      if (value === ws) {
        clients.delete(key);
      }
    });
  });
});

app.locals.clients = clients;
global.app = app;

const handleTcpRequest = (req, res, action, data = {}) => {
  const socket = new net.Socket();

  socket.connect(serverPort, serverIp, () => {
    const message = JSON.stringify({
      action: action,
      data: data,
    });

    console.log("Enviando al servidor TCP:", message);
    socket.write(message + "\n");
  });

  socket.on("data", (data) => {
    try {
      const response = JSON.parse(data.toString());
      res.json(response);
      socket.end();
    } catch (err) {
      console.error("Error procesando respuesta:", err);
      res.status(500).json({ status: "error", body: "Respuesta inválida del servidor TCP" });
      socket.destroy();
    }
  });

  socket.on("error", (err) => {
    console.error("Error en la conexión TCP:", err.message);
    res.status(500).json({ status: "error", body: "Error en la conexión TCP" });
    socket.destroy();
  });

  socket.on("close", () => {
    console.log("Conexión TCP cerrada");
  });
};


//Mensajería TCP

app.post("/users", (req, res) => { handleTcpRequest(req, res, "register_user", req.body); });
app.get("/users", (req, res) => { handleTcpRequest(req, res, "get_online_users"); });
app.get("/groups", (req, res) => { handleTcpRequest(req, res, "get_user_groups", req.query); });
app.post("/create-group", (req, res) => { handleTcpRequest(req, res, "create_group", req.body); });
app.post("/add_text", (req, res) => { handleTcpRequest(req, res, "add_text", req.body); });
app.get("/get_messages", (req, res) => { handleTcpRequest(req, res, "get_messages", req.query); });
app.put("/users/status", (req, res) => { handleTcpRequest(req, res, "logout_user", req.body); });


// ========================================================
// === HANDLERS DE VOZ Y LLAMADAS (ICE y COMPATIBILIDAD) ===
// ========================================================

// 1. Iniciar llamada (ZeroC Ice)
const startCallHandler = async (req, res) => {
  try {
    const { sender, receiver } = req.body;
    // La ruta del cliente usa 'sender' y 'receiver'
    const udpInfo = await requestCall(sender, receiver);

    if (udpInfo && udpInfo.callID) {
      res.json({ status: 'ok', data: udpInfo });
    } else {
      res.status(500).json({ status: 'error', message: 'Fallo al iniciar llamada Ice.' });
    }
  } catch (e) {
    console.error("Error en /api/call/request:", e);
    res.status(500).json({ status: 'error', message: e.toString() });
  }
};

// 2. Finalizar llamada (ZeroC Ice)
const endCallHandler = async (req, res) => {
  try {
    const callID = req.body.callID || req.body.callId || req.body.callid || "ID_REQUERIDO";
    await endCall(callID);
    res.json({ status: 'ok', message: 'Llamada finalizada.' });
  } catch (e) {
    console.error("Error en /api/call/end:", e);
    res.status(500).json({ status: 'error', message: e.toString() });
  }
};

const sendVoiceMessageHandler = async (req, res) => {
  try {
    const { sender, receiver, audioData } = req.body;

    const audioBuffer = Buffer.from(audioData, 'base64');

    await sendVoiceMessage(sender, receiver, audioBuffer);
    res.json({ status: 'ok', message: 'Mensaje de voz enviado a persistencia.' });
  } catch (e) {
    console.error("Error en /api/voice-message/send:", e);
    res.status(500).json({ status: 'error', message: e.toString() });
  }
};

const downloadAudioHandler = (req, res) => {
  const fileName = req.query.fileName;
  const data = { fileName };
  // Llama a la acción 'get_audio' en el servidor Java TCP (puerto 5000)
  handleTcpRequest(req, res, "get_audio", data);
};


// ========================================================
// === Mapeo de Rutas (Compatibilidad con Código Existente) ===
// ========================================================

// Mapeo para /start_call
app.post("/start_call", startCallHandler); // Cliente llama /start_call
app.post("/api/call/request", startCallHandler); // Endpoint nuevo

// Mapeo para /end_call
app.post("/end_call", endCallHandler); // Cliente llama /end_call
app.post("/api/call/end", endCallHandler); // Endpoint nuevo

// Mapeo para /send_audio y /record_audio
app.post("/send_audio", sendVoiceMessageHandler); //Envio por ice

app.post("/record_audio", (req, res) => {
  console.log("Compatibilidad: Ignorando /record_audio. La grabación ocurre en el cliente.");
  res.json({ status: 'ok', message: 'Grabación iniciada localmente.' });
});

// Nuevo Endpoint para descarga de audios
app.get("/api/audio/download", downloadAudioHandler);


// ========================================================
// === STARTUP ===
// ========================================================

server.listen(port, () => {
  console.log(`Proxy HTTP y WS escuchando en http://localhost:${port}`);
});