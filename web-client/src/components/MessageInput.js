import axios from "axios";

export class MessageInput {
  constructor(chat) {
    this.chat = chat; // Referencia al componente padre para recargar mensajes
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
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

    // Función para manejar el estado visual de los botones
    const updateButtonsState = () => {
      const text = input.value.trim();
      const hasText = text !== "";

      // Botón Enviar: Habilitado si hay texto y NO se está grabando
      sendButton.disabled = !hasText || this.isRecording;
      sendButton.classList.toggle("active", hasText && !this.isRecording);

      // Botón Grabar: Habilitado si NO hay texto (prioridad al texto)
      recordButton.disabled = hasText && !this.isRecording;
      recordButton.classList.toggle("active", !hasText && !this.isRecording);

      // Bloquear input mientras se graba
      input.disabled = this.isRecording;
    };

    // Listener de escritura
    input.addEventListener("input", updateButtonsState);

    // ---------------------------------------------------------
    // LÓGICA DE GRABACIÓN DE AUDIO (CLIENT-SIDE)
    // ---------------------------------------------------------
    recordButton.addEventListener("click", async () => {
      const sender = sessionStorage.getItem("username");
      const receiver = this.chat.receiver;

      if (!this.isRecording) {
        // --- INICIAR GRABACIÓN ---
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          this.mediaRecorder = new MediaRecorder(stream);
          this.audioChunks = [];

          // Guardar fragmentos de audio
          this.mediaRecorder.ondataavailable = (event) => {
            this.audioChunks.push(event.data);
          };

          // Al detenerse, procesar el archivo y enviarlo
          this.mediaRecorder.onstop = async () => {
            // 1. Crear Blob de audio
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });

            // 2. Convertir a Base64
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
              // Quitamos el encabezado "data:audio/wav;base64,"
              const base64String = reader.result.split(',')[1];

              // 3. Enviar al Proxy
              try {
                console.log("Subiendo nota de voz...");
                const response = await axios.post("http://localhost:3001/send_audio", {
                  sender,
                  receiver,
                  audioData: base64String
                });

                console.log("Audio enviado:", response.data);

                // 4. Refrescar el chat para mostrar el nuevo mensaje
                this.chat.loadMessages();
              } catch (err) {
                console.error("Error al enviar el audio:", err);
                alert("Falló el envío del audio.");
              }
            };
          };

          this.mediaRecorder.start();
          this.isRecording = true;

          // Actualizar UI
          recordButton.textContent = "Detener";
          recordButton.classList.add("recording"); // Clase para ponerlo rojo si tienes CSS
          updateButtonsState();

        } catch (e) {
          console.error("Error accediendo al micrófono:", e);
          alert("No se pudo acceder al micrófono. Por favor permite el acceso.");
        }

      } else {
        // --- DETENER GRABACIÓN ---
        if (this.mediaRecorder) {
          this.mediaRecorder.stop();
          this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }

        this.isRecording = false;

        // Restaurar UI
        recordButton.textContent = "Grabar audio";
        recordButton.classList.remove("recording");
        updateButtonsState();
      }
    });

    // ---------------------------------------------------------
    // LÓGICA DE ENVÍO DE TEXTO (EXISTENTE)
    // ---------------------------------------------------------
    sendButton.addEventListener("click", async () => {
      const text = input.value.trim();
      if (!text) return;

      const sender = sessionStorage.getItem("username");
      const receiver = this.chat.receiver;
      const endpoint = this.chat.isGroup ? "/add_group_text" : "/add_text"; // Ajusta si usas un endpoint unificado

      // Si tu backend usa un solo endpoint para ambos, usa ese.
      // Basado en tu código anterior, parece que usas add_text genérico o lógica en backend.
      // Aquí asumo el endpoint estándar que tenías:
      try {
        await axios.post("http://localhost:3001/add_text", {
          sender,
          receiver,
          text,
        });

        input.value = "";
        updateButtonsState();
        await this.chat.loadMessages(); // Recargar mensajes
      } catch (error) {
        console.error("Error al enviar mensaje:", error);
      }
    });

    // Permitir enviar con Enter
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !sendButton.disabled) {
        sendButton.click();
      }
    });

    // Inicializar estado
    updateButtonsState();

    return div;
  }
}