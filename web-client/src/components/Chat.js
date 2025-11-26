import axios from "axios";
import { MessageInput } from "./MessageInput.js";

export class Chat {
  constructor(receiver, isGroup = false) {
    this.receiver = receiver; // username o nombre del grupo
    this.isGroup = isGroup;
    this.messages = [];
  }

  render() {
    this.wrapper = document.createElement("div");
    this.wrapper.classList.add("chat-wrapper");

    // Contenedor de burbujas de mensaje
    this.div = document.createElement("div");
    this.div.classList.add("msg-container");

    // Componente de entrada (Texto y Grabación)
    const messageInput = new MessageInput(this).render();

    this.wrapper.append(this.div, messageInput);

    // Cargar historial inicial
    this.loadMessages();

    return this.wrapper;
  }

  async loadMessages() {
    try {
      const sender = sessionStorage.getItem("username");

      const response = await axios.get("http://localhost:3001/get_messages", {
        params: { sender, receiver: this.receiver },
      });

      // Ajuste para depuración
      // console.log("Mensajes recibidos:", response.data);

      if (response.data.status === "ok") {
        // Asumiendo que el backend devuelve { data: { messages: [...] } }
        const msgs = response.data.data?.messages || response.data.body?.messages || [];
        this.renderMessages(msgs);
      } else if (response.data.status === "warning"){
        this.div.innerHTML = `<p class="light-text">No hay mensajes aún.</p>`;
      }

    } catch (error) {
      console.error("Error al obtener mensajes:", error);
      this.div.innerHTML = `<p class="light-text">Error de conexión al cargar mensajes.</p>`;
    }
  }

  renderMessages(messages) {
    this.div.innerHTML = ""; // Limpiar antes de pintar
    const currentUser = sessionStorage.getItem("username");

    if (messages.length === 0) {
      this.div.innerHTML = `<p class="light-text">No hay mensajes.</p>`;
      return;
    }

    messages.forEach((msg) => {
      const msgWrapper = document.createElement("div");
      const isMine = msg.sender === currentUser;

      msgWrapper.classList.add("message-wrapper");
      msgWrapper.classList.add(isMine ? "mine" : "theirs");

      const msgBubble = document.createElement("div");
      msgBubble.classList.add("message-bubble");

      // Mostrar nombre si es grupo y no soy yo
      if (this.isGroup && !isMine) {
        const senderName = document.createElement("div");
        senderName.classList.add("sender-name");
        senderName.textContent = msg.sender;
        msgBubble.appendChild(senderName);
      }

      // ------------------------------------------
      // LÓGICA DE VISUALIZACIÓN (AUDIO VS TEXTO)
      // ------------------------------------------
      if (msg.type === "audio") {
        const audioContent = document.createElement("div");
        audioContent.classList.add("audio-player-container"); // Puedes estilizar esto en CSS

        const audio = document.createElement("audio");
        audio.controls = true;

        audio.src = `http://localhost:3001/api/audio/${msg.audioId}`;

        audio.preload = "metadata";

        audioContent.appendChild(audio);
        msgBubble.appendChild(audioContent);

      } else {
        // Mensaje de Texto
        const textSpan = document.createElement("span");
        textSpan.textContent = msg.text;
        msgBubble.appendChild(textSpan);
      }

      msgWrapper.appendChild(msgBubble);
      this.div.appendChild(msgWrapper);
    });

    // Auto-scroll al final
    this.div.scrollTop = this.div.scrollHeight;
  }
}
