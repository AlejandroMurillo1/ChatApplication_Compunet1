const express = require('express');
const net = require('net');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const port = 3001;

const serverPort = 5000;
const serverIp = "localhost";

app.post("/users", (req, res) => {
  const userData = req.body;

  // crear un nuevo socket para cada petición
  const socket = new net.Socket();

  socket.connect(serverPort, serverIp, () => {
    const message = JSON.stringify({
      action: "register_user",
      data: userData,
    });

    console.log("Enviando al servidor TCP:", message);
    socket.write(message + "\n");
  });

  socket.on("data", (data) => {
    try {
      const response = JSON.parse(data.toString());
      console.log("Respuesta del servidor TCP:", response);
      res.json(response);
      socket.end(); // cerrar después de recibir respuesta
    } catch (err) {
      console.error("Error procesando respuesta:", err);
      res.status(500).json({ status: "error", body: "Respuesta inválida del servidor TCP" });
      socket.destroy();
    }
  });

  socket.on("error", (err) => {
    console.error("Error en la conexión TCP:", err.message);
    res.status(500).json({ status: "error", body: "Error en la conexión TCP" });
  });

  socket.on("close", () => {
    console.log("Conexión TCP cerrada");
  });
});

app.get("/users", (req, res) => {
  const socket = new net.Socket();

  socket.connect(serverPort, serverIp, () => {
    const message = JSON.stringify({
      action: "get_online_users",
    });

    console.log("Enviando al servidor TCP:", message);
    socket.write(message + "\n");
  });

  socket.on("data", (data) => {
    try {
      const response = JSON.parse(data.toString());
      console.log("Respuesta del servidor TCP:", response);
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
  });

  socket.on("close", () => {
    console.log("Conexión TCP cerrada");
  });
});

app.get("/groups", (req, res) => {
  const username = req.query.username;
  const userData = { username };

  const socket = new net.Socket();

  socket.connect(serverPort, serverIp, () => {
    const message = JSON.stringify({
      action: "get_user_groups",
      data: userData
    });

    console.log("Enviando al servidor TCP:", message);
    socket.write(message + "\n");
  });

  socket.on("data", (data) => {
    try {
      const response = JSON.parse(data.toString());
      console.log("Respuesta del servidor TCP:", response);
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
  });

  socket.on("close", () => {
    console.log("Conexión TCP cerrada");
  });
});

app.post("/create-group", (req, res) => {
  const groupData = req.body;

  const socket = new net.Socket();

  socket.connect(serverPort, serverIp, () => {
    const message = JSON.stringify({
      action: "create_group",   
      data: groupData,        
    });

    console.log("Enviando al servidor TCP:", message);
    socket.write(message + "\n");
  });

  socket.on("data", (data) => {
    try {
      const response = JSON.parse(data.toString());
      console.log("Respuesta del servidor TCP:", response);
      res.json(response);
      socket.end();
    } catch (err) {
      console.error("Error procesando respuesta:", err);
      res
        .status(500)
        .json({ status: "error", body: "Respuesta inválida del servidor TCP" });
      socket.destroy();
    }
  });

  socket.on("error", (err) => {
    console.error("Error en la conexión TCP:", err.message);
    res
      .status(500)
      .json({ status: "error", body: "Error en la conexión TCP" });
  });

  socket.on("close", () => {
    console.log("Conexión TCP cerrada");
  });
});

app.post("/add_message", (req, res) => {
  const messageData = req.body;

  const socket = new net.Socket();

  socket.connect(serverPort, serverIp, () => {
    const message = JSON.stringify({
      action: "add_message",   
      data: messageData,        
    });

    console.log("Enviando al servidor TCP:", message);
    socket.write(message + "\n");
  });

  socket.on("data", (data) => {
    try {
      const response = JSON.parse(data.toString());
      console.log("Respuesta del servidor TCP:", response);
      res.json(response);
      socket.end();
    } catch (err) {
      console.error("Error procesando respuesta:", err);
      res
        .status(500)
        .json({ status: "error", body: "Respuesta inválida del servidor TCP" });
      socket.destroy();
    }
  });

  socket.on("error", (err) => {
    console.error("Error en la conexión TCP:", err.message);
    res
      .status(500)
      .json({ status: "error", body: "Error en la conexión TCP" });
  });

  socket.on("close", () => {
    console.log("Conexión TCP cerrada");
  });
});

app.get("/get_messages", (req, res) => {
  const sender = req.query.sender;
  const receiver = req.query.receiver;
  const data = { sender, receiver };

  const socket = new net.Socket();

  socket.connect(serverPort, serverIp, () => {
    const message = JSON.stringify({
      action: "get_messages",
      data: data
    });

    console.log("Enviando al servidor TCP:", message);
    socket.write(message + "\n");
  });

  socket.on("data", (data) => {
    try {
      const response = JSON.parse(data.toString());
      console.log("Respuesta del servidor TCP:", response);
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
  });

  socket.on("close", () => {
    console.log("Conexión TCP cerrada");
  });
});

app.put("/users/status", (req, res) => {
  const userData = req.body;

  // crear un nuevo socket para cada petición
  const socket = new net.Socket();

  socket.connect(serverPort, serverIp, () => {
    const message = JSON.stringify({
      action: "logout_user",
      data: userData,
    });

    console.log("Enviando al servidor TCP:", message);
    socket.write(message + "\n");
  });

  socket.on("data", (data) => {
    try {
      const response = JSON.parse(data.toString());
      console.log("Respuesta del servidor TCP:", response);
      res.json(response);
      socket.end(); // cerrar después de recibir respuesta
    } catch (err) {
      console.error("Error procesando respuesta:", err);
      res.status(500).json({ status: "error", body: "Respuesta inválida del servidor TCP" });
      socket.destroy();
    }
  });

  socket.on("error", (err) => {
    console.error("Error en la conexión TCP:", err.message);
    res.status(500).json({ status: "error", body: "Error en la conexión TCP" });
  });

  socket.on("close", () => {
    console.log("Conexión TCP cerrada");
  });
});

app.listen(port, () => {
  console.log(`Proxy HTTP escuchando en http://localhost:${port}`);
});