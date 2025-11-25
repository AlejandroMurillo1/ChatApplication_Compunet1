import axios from "axios";

export class MessageInput {
  constructor(chat) {
    this.chat = chat;
    this.isRecording = false;
  }

  render() {
    const div = document.createElement("div");
    div.classList.add("message-input");
    div.innerHTML = `
      <input id="msg" class="font-text-input" type="text" placeholder="Escribe un mensaje">
      <button id="record" class="button-on-off">Grabar audio</button>
      <button id="send" class="button-on-off" disabled>Enviar</button>
    `;

    const input = div.querySelector("#msg");
    const sendButton = div.querySelector("#send");
    const recordButton = div.querySelector("#record");

    const updateButtonsState = () => {
      const text = input.value.trim();
      const hasText = text !== "";

      // Botón Enviar: solo cuando hay texto y NO se está grabando
      sendButton.disabled = !hasText || this.isRecording;
      sendButton.classList.toggle("active", hasText && !this.isRecording);

      // Botón Grabar audio: solo cuando NO hay texto y NO se está enviando texto
      // (mientras hay texto, no se puede iniciar grabación)
      recordButton.disabled = hasText && !this.isRecording;
      recordButton.classList.toggle("active", !hasText && !this.isRecording);

      // Input deshabilitado mientras se graba
      input.disabled = this.isRecording;
    };

    // Cuando el usuario escribe, actualizamos estados
    input.addEventListener("input", () => {
      updateButtonsState();
    });

    // Enviar mensaje de texto
    sendButton.addEventListener("click", async () => {
      const text = input.value.trim();
      if (!text || this.isRecording) return;

      const sender = sessionStorage.getItem("username");
      const receiver = this.chat.receiver;

      try {
        const response = await axios.post("http://localhost:3001/add_text", {
          sender,
          receiver,
          message: text,
        });
        console.log("Respuesta del proxy (texto):", response.data);

        input.value = "";
        updateButtonsState();

        this.chat.loadMessages();
      } catch (error) {
        console.error("Error al enviar mensaje:", error);
      }
    });

    // Grabar / detener grabación de audio
    recordButton.addEventListener("click", async () => {
      const sender = sessionStorage.getItem("username");
      const receiver = this.chat.receiver;

      if (!this.isRecording) {
        // Iniciar grabación
        try {
          const response = await axios.post("http://localhost:3001/record_audio", {
            sender,
            receiver,
          });
          console.log("Respuesta del proxy (record-audio):", response.data);

          // Solo si fue bien cambiamos el estado
          this.isRecording = true;
          recordButton.textContent = "Grabando";
          recordButton.classList.add("recording");
          updateButtonsState();
        } catch (error) {
          console.error("Error al iniciar grabación:", error);
        }
      } else {
        // Detener grabación y enviar audio
        try {
          const response = await axios.post("http://localhost:3001/send_audio", {
            sender,
            receiver,
          });
          console.log("Respuesta del proxy (send-audio):", response.data);

          this.isRecording = false;
          recordButton.textContent = "Grabar audio";
          recordButton.classList.remove("recording");
          updateButtonsState();

          // Si quieres recargar mensajes después de enviar el audio:
          this.chat.loadMessages();
        } catch (error) {
          console.error("Error al finalizar/enviar grabación:", error);
        }
      }
    });

    // Estado inicial
    updateButtonsState();

    return div;
  }
} 