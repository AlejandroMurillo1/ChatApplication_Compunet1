import axios from "axios";
import { MessageInput } from "./MessageInput.js";

export class Chat {
  constructor(receiver, isGroup = false) {
    this.receiver = receiver;
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
    this.loadMessages();

    return this.wrapper;
  }

  async loadMessages() {
    try {
      const sender = sessionStorage.getItem("username");
      const response = await axios.get("http://localhost:3001/get_messages", {
        params: { sender, receiver: this.receiver },
      });

      console.log("Mensajes recibidos del proxy:", response.data);

      if (response.data.status === "ok") {
        this.renderMessages(response.data.data.messages);
      } else if (response.data.status === "warning") {
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
      const { type, sender, audioId } = msg;

      // Validar que los mensajes de audio tengan audioId
      if (type === "audio" && !audioId) {
        console.warn("Mensaje de audio sin audioId:", msg);
        return; // Saltar este mensaje
      }

      const msgWrapper = document.createElement("div");
      msgWrapper.classList.add("chat-message-wrapper");

      const isCurrentUser = sender === currentUser;

      // Mostrar remitente en grupos o para audios
      if ((this.isGroup && sender !== currentUser) || type === "audio") {
        const senderLabel = document.createElement("div");
        senderLabel.classList.add("chat-sender");
        senderLabel.textContent = sender;
        msgWrapper.appendChild(senderLabel);
      }

      const msgBubble = document.createElement("div");
      msgBubble.classList.add("chat-message");
      if (isCurrentUser) {
        msgBubble.classList.add("sent");
      } else {
        msgBubble.classList.add("received");
      }

      if (type === "text") {
        msgBubble.textContent = msg.text ?? "";
      } else if (type === "audio") {
        const audioContent = document.createElement("div");
        audioContent.classList.add("audio-message-content");

        const playButton = document.createElement("button");
        playButton.classList.add("audio-play-button");
        playButton.textContent = "▶";

        const audioLabel = document.createElement("span");
        audioLabel.classList.add("audio-label");
        audioLabel.textContent = "Mensaje de voz";

        const audio = document.createElement("audio");

        // ⬅️ CORRECCIÓN: Usar la URL correcta y verificar el audioId
        if (audioId) {
          // Verificar que el endpoint en tu backend sea correcto
          audio.src = `http://localhost:3001/get_audio_file/${encodeURIComponent(msg.audioId)}`;
          audio.preload = "metadata";

          // Agregar controles de fallback para debugging
          audio.addEventListener("error", (e) => {
            console.error("Error cargando audio:", e);
            console.error("Audio ID:", audioId);
            console.error("Audio src:", audio.src);
            playButton.textContent = "❌";
            playButton.disabled = true;
          });

          audio.addEventListener("canplaythrough", () => {
            console.log("Audio cargado y listo:", audioId);
          });

          playButton.addEventListener("click", () => {
            if (audio.paused) {
              audio.play().catch(error => {
                console.error("Error reproduciendo audio:", error);
                playButton.textContent = "❌";
              });
              playButton.textContent = "⏸";
            } else {
              audio.pause();
              playButton.textContent = "▶";
            }
          });

          audio.addEventListener("ended", () => {
            playButton.textContent = "▶";
          });

          audio.addEventListener("pause", () => {
            playButton.textContent = "▶";
          });
        } else {
          playButton.textContent = "❌";
          playButton.disabled = true;
          audioLabel.textContent = "Audio no disponible";
        }

        audioContent.appendChild(playButton);
        audioContent.appendChild(audioLabel);
        msgBubble.appendChild(audioContent);
      } else {
        msgBubble.textContent = "[Tipo de mensaje desconocido]";
      }

      msgWrapper.appendChild(msgBubble);
      this.div.appendChild(msgWrapper);
    });

    this.div.scrollTop = this.div.scrollHeight;
  }
}