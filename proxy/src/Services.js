const express = require('express');
const net = require('net');
const cors = require('cors');
const { Buffer } = require('buffer');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const { registerCallback } = require('./services/IceCallbackServer');
const { requestCall, endCall, sendVoiceMessage } = require('./services/IceClient');

const app = express();
app.use(cors());
// IMPORTANTE: Aumentamos el límite para recibir audios en Base64
app.use(express.json({ limit: '10mb' }));

// ------------------------------------------------------------------
// 1. SERVIDOR DE ARCHIVOS ESTÁTICOS (Para reproducir audios)
// ------------------------------------------------------------------
const AUDIO_FOLDER = path.join(__dirname, '../../Server/data');

app.use('/api/audio', express.static(AUDIO_FOLDER));
console.log(`[File Server] Sirviendo audios desde: ${AUDIO_FOLDER}`);

const port = 3001;     // Puerto del Proxy
const serverPort = 5000; // Puerto TCP de Java (Mensajería)
const serverIp = "localhost";

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Mapeo: ID_Usuario -> WebSocket
const clients = new Map();

// ==================================================================
// 2. WEBSOCKETS: Señalización y Relay de Audio (Streaming)
// ==================================================================
wss.on('connection', (ws) => {
  let myClientID = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // A. REGISTRO DEL CLIENTE
      if (data.type === 'register' && data.clientID) {
        myClientID = data.clientID;
        clients.set(myClientID, ws);
        console.log(`[WS] Cliente registrado: ${myClientID}`);

        // Registramos también en Ice para que Java pueda enviarle notificaciones
        registerCallback(myClientID).catch(err => console.error("[Ice Register Error]", err));
      }

          // B. RELAY DE AUDIO (STREAMING EN VIVO)
      // El cliente envía: { type: 'audio_stream', target: 'usuarioDestino', audio: 'base64...' }
      else if (data.type === 'audio_stream') {
        const targetSock = clients.get(data.target);

        if (targetSock && targetSock.readyState === WebSocket.OPEN) {
          // Reenviamos el paquete de audio al destinatario inmediatamente
          targetSock.send(JSON.stringify({
            type: 'audio_stream',
            sender: myClientID,
            audio: data.audio
          }));
        }
      }
    } catch (e) {
      console.error('[WS Error] Mensaje no válido:', e.message);
    }
  });

  ws.on('close', () => {
    if (myClientID) {
      console.log(`[WS] Cliente desconectado: ${myClientID}`);
      clients.delete(myClientID);
    }
  });
});

app.locals.clients = clients;
global.app = app;

// Helper para consultas TCP (Mensajería Texto / Usuarios)
const handleTcpRequest = (req, res, action, data = {}) => {
  const socket = new net.Socket();
  socket.connect(serverPort, serverIp, () => {
    socket.write(JSON.stringify({ action, data }) + "\n");
  });

  socket.on("data", (d) => {
    try {
      res.json(JSON.parse(d.toString()));
    } catch (e) { res.status(500).json({error: "Invalid JSON from Java TCP"}); }
    socket.end();
  });

  socket.on("error", (e) => res.status(500).json({ error: "TCP Connection Error: " + e.message }));
};

// Rutas TCP Mensajes
app.post("/users", (req, res) => handleTcpRequest(req, res, "register_user", req.body));
app.get("/users", (req, res) => handleTcpRequest(req, res, "get_online_users"));
app.get("/groups", (req, res) => handleTcpRequest(req, res, "get_user_groups", req.query));
app.post("/create-group", (req, res) => handleTcpRequest(req, res, "create_group", req.body));
app.post("/add_text", (req, res) => handleTcpRequest(req, res, "add_text", req.body));
app.get("/get_messages", (req, res) => handleTcpRequest(req, res, "get_messages", req.query));
app.put("/users/status", (req, res) => handleTcpRequest(req, res, "logout_user", req.body));

// --- RUTAS DE LLAMADAS Y VOZ (ICE) ---

// Iniciar Llamada
app.post("/api/call/request", async (req, res) => {
  try {
    const { sender, receiver } = req.body;
    // Java valida y devuelve { callID, status }
    const callInfo = await requestCall(sender, receiver);
    res.json({ status: 'ok', data: callInfo });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Terminar Llamada
app.post("/api/call/end", async (req, res) => {
  try {
    await endCall(req.body.callID);
    res.json({ status: 'ok' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Enviar Nota de Voz (Persistencia)
app.post("/send_audio", async (req, res) => {
  try {
    const { sender, receiver, audioData } = req.body;
    // Convertimos Base64 a Buffer para enviar por Ice
    const buffer = Buffer.from(audioData, 'base64');
    await sendVoiceMessage(sender, receiver, buffer);
    res.json({ status: 'ok', message: 'Audio guardado exitosamente' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Compatibilidad con rutas antiguas (opcional)
app.post("/start_call", (req, res) => res.redirect(307, "/api/call/request"));
app.post("/end_call", (req, res) => res.redirect(307, "/api/call/end"));

// Iniciar Servidor
server.listen(port, () => {
  console.log(`[Proxy] Escuchando en http://localhost:${port}`);
  console.log(`[WS] Servidor WebSocket listo`);
});