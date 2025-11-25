import axios from "axios";
import { MessageInput } from "./MessageInput.js";

export class Chat {
  constructor(receiver, isGroup = false) {
    this.receiver = receiver; // puede ser un username o nombre del grupo
    this.isGroup = isGroup;
    this.messages = [];
  }

  render() {
    this.wrapper = document.createElement("div");
    this.wrapper.classList.add("chat-wrapper");

    this.div = document.createElement("div");
    this.div.classList.add("msg-container");

    const messageInput = new MessageInput(this).render();

    this.wrapper.append(this.div, messageInput);

    // cargar mensajes según tipo
    this.loadMessages();

    return this.wrapper;
  }

  async loadMessages() {
    try {
      const sender = sessionStorage.getItem("username");

      const response = await axios.get("http://localhost:3001/get_messages", {
          params: { sender, receiver: this.receiver },
        });
      console.log("Mensaje recibido del proxy:", response.data);

      if (response.data.status === "ok") {
        this.renderMessages(response.data.data.messages);
      } else if (response.data.status === "warning"){
        this.div.innerHTML = `<p class="light-text">No hay mensajes</p>`;
      }

    } catch (error) {
      console.error("Error al obtener mensajes:", error);
      this.div.innerHTML = `<p class="light-text">Error al obtener mensajes</p>`;
    }
  }

  renderMessages(messages) {
    this.div.innerHTML = "";  
    const currentUser = sessionStorage.getItem("username");

    messages.forEach((msg) => {
      const { type, sender } = msg;

      // contenedor del mensaje completo (nombre + burbuja)
      const msgWrapper = document.createElement("div");
      msgWrapper.classList.add("chat-message-wrapper");

      const isCurrentUser = sender === currentUser;

      // nombre del remitente:
      // - si es grupo y no soy yo (como antes)
      // - o si es audio (siempre mostrar remitente)
      if ((this.isGroup && sender !== currentUser) || type === "audio") {
        const senderLabel = document.createElement("div");
        senderLabel.classList.add("chat-sender");
        senderLabel.textContent = sender;
        msgWrapper.appendChild(senderLabel);
      }

      // burbuja del mensaje
      const msgBubble = document.createElement("div");
      msgBubble.classList.add("chat-message");
      if (isCurrentUser) {
        msgBubble.classList.add("sent");
      } else {
        msgBubble.classList.add("received");
      }

      if (type === "text") {
        // Mensaje de texto: igual que antes
        msgBubble.textContent = msg.text ?? "";
      } else if (type === "audio") {
        // Mensaje de audio: estilo WhatsApp
        const audioContent = document.createElement("div");
        audioContent.classList.add("audio-message-content");

        const playButton = document.createElement("button");
        playButton.classList.add("audio-play-button");
        playButton.textContent = "▶";

        const audioLabel = document.createElement("span");
        audioLabel.classList.add("audio-label");
        audioLabel.textContent = "Mensaje de voz";

        const audio = document.createElement("audio");

        /* ⚠️ Ajusta esta URL al endpoint real donde sirves el audio
        audio.src = `http://localhost:3001/get-audio?audioId=${encodeURIComponent(
          msg.audioId
        )}`;
        audio.preload = "metadata";

        playButton.addEventListener("click", () => {
          if (audio.paused) {
            audio.play();
            playButton.textContent = "⏸";
          } else {
            audio.pause();
            playButton.textContent = "▶";
          }
        });

        audio.addEventListener("ended", () => {
          playButton.textContent = "▶";
        });

        *///Revisar

        audioContent.appendChild(playButton);
        audioContent.appendChild(audioLabel);
        msgBubble.appendChild(audioContent);
      } else {
        // Por si llega algo raro
        msgBubble.textContent = "";
      }

      msgWrapper.appendChild(msgBubble);
      this.div.appendChild(msgWrapper);
    });

    this.div.scrollTop = this.div.scrollHeight;
  }

}
