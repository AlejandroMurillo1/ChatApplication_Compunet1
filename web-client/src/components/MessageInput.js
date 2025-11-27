import axios from "axios";

export class MessageInput {
  constructor(chat) {
    this.chat = chat;
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  async startRecording() {
    try {
      // 1. Obtener acceso al micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 2. Crear el grabador
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      // 3. Almacenar los datos de audio
      this.mediaRecorder.ondataavailable = event => {
        this.audioChunks.push(event.data);
      };

      // 4. Iniciar la grabación
      this.mediaRecorder.start();
      console.log("[Audio] Grabación iniciada.");
      return true;

    } catch (error) {
      console.error("[Audio] Error al acceder al micrófono:", error);
      alert("Permiso de micrófono denegado o no disponible.");
      return false;
    }
  }

  stopRecordingAndGetBase64() {
    return new Promise(resolve => {
      if (!this.mediaRecorder) return resolve(null);

      // Detener la grabación. El evento 'stop' se dispara luego.
      this.mediaRecorder.stop();

      this.mediaRecorder.onstop = async () => {
        // 1. Detener la pista del micrófono
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());

        // 2. Combinar los trozos en un Blob (formato por defecto: audio/ogg o audio/webm)
        const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType });

        // 3. Leer el Blob como Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);

        reader.onloadend = () => {
          const base64StringWithPrefix = reader.result;

          // 4. CRÍTICO: Eliminar el prefijo MIME para obtener la cadena Base64 pura
          // (el Proxy Node.js lo espera sin prefijo)
          const base64Pure = base64StringWithPrefix.split(',')[1];

          console.log("[Audio] Grabación finalizada. Tamaño Base64:", base64Pure.length);
          resolve(base64Pure);
        };
      };
    });
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
        const success = await this.startRecording();
        if(success){
          this.isRecording = true;
          updateButtonsState();
          recordButton.textContent = "Grabando... (Click para enviar)";
          recordButton.classList.add("recording");
        }

      } else {

        const audioBase64 = await this.stopRecordingAndGetBase64();

        if (!audioBase64) {
          console.error("No se pudo obtener el audio Base64.");
          this.isRecording = false;
          updateButtonsState();
          return;
        }

        try {
          // ⬅️ CORRECCIÓN: Llamar a /send_audio y enviar el Base64
          const response = await axios.post("http://localhost:3001/send_audio", {
            sender,
            receiver,
            audioData: audioBase64,
          });
          console.log("Respuesta del proxy (send-audio):", response.data);

          this.isRecording = false;
          recordButton.textContent = "Grabar audio";
          recordButton.classList.remove("recording");
          updateButtonsState();

          await this.chat.loadMessages();
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