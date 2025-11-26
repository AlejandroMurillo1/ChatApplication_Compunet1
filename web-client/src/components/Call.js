import axios from "axios";
import { WebSocketService } from "../services/WebSocketService.js";

export class Call {
  constructor(receiver) {
    this.receiver = receiver;
    this.wsService = WebSocketService.getInstance();
    this.mediaRecorder = null;

    // Contexto de audio para reproducir lo que llega del otro usuario
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.nextStartTime = 0;

    // Enlazamos el método para poder usar 'this' dentro y remover el listener después
    this.handleIncomingAudio = this.handleIncomingAudio.bind(this);
  }

  // 1. Capturar micrófono y enviar audio por WebSocket
  async startCapture() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Grabamos en chunks pequeños (100ms) para baja latencia
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          const reader = new FileReader();
          reader.readAsDataURL(e.data);
          reader.onloadend = () => {
            // Quitamos el encabezado "data:audio/webm;base64," para enviar solo los datos
            const base64Audio = reader.result.split(',')[1];

            // Enviamos al Proxy, que lo retransmitirá al receptor
            this.wsService.send({
              type: 'audio_stream',
              target: this.receiver,
              audio: base64Audio
            });
          };
        }
      };

      // Iniciar grabación enviando datos cada 100ms
      this.mediaRecorder.start(100);
      console.log("Micrófono activo. Transmitiendo...");

    } catch (err) {
      console.error("Error al acceder al micrófono:", err);
      alert("No se pudo acceder al micrófono. Verifica los permisos.");
    }
  }

  // 2. Procesar audio que llega del otro usuario
  async handleIncomingAudio(data) {
    // Solo reproducir si el audio viene de la persona con la que estoy hablando
    if (data.sender === this.receiver && data.audio) {
      try {
        // Decodificar Base64 a ArrayBuffer
        const binaryString = window.atob(data.audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Decodificar los datos de audio crudos
        const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);

        // Preparar la fuente de reproducción
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);

        // Agendar la reproducción para que no haya cortes (Buffering simple)
        const now = this.audioContext.currentTime;
        if (this.nextStartTime < now) {
          this.nextStartTime = now;
        }
        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;

      } catch (e) {
        console.error("Error decodificando audio entrante:", e);
      }
    }
  }

  render() {
    // Suscribirse al evento de streaming del WebSocket
    this.wsService.on('audio_stream', this.handleIncomingAudio);

    // Iniciar mi transmisión de audio
    this.startCapture();

    // Crear la interfaz visual
    const wrapper = document.createElement("div");
    wrapper.classList.add("call-container");

    wrapper.innerHTML = `
      <div class="call-info">
        <div class="call-name">${this.receiver}</div>
        <div class="call-status">En llamada...</div>
        <div style="font-size: 60px; margin-top: 30px; animation: pulse 2s infinite;">🔊</div>
      </div>
      <div class="call-bottom-bar">
        <button class="call-end-button" id="btnHangup" title="Colgar">Colgar</button>
      </div>
    `;

    // Lógica del botón Colgar
    wrapper.querySelector("#btnHangup").addEventListener("click", async () => {
      this.cleanup(); // Detener recursos locales (micrófono, listeners)

      const sender = sessionStorage.getItem("username");

      // Notificar al servidor (Ice) que terminó la llamada
      try {
        await axios.post("http://localhost:3001/api/call/end", {
          callID: "CURRENT_CALL_ID", // Si tienes el ID real, mejor. Si no, el servidor lo maneja.
          sender,
          receiver: this.receiver
        });
      } catch (e) {
        console.error("Error enviando señal de fin de llamada:", e);
      }

      // Disparar evento para avisar al componente padre (ChatPage) que cierre esta vista
      const event = new CustomEvent("call:hangup", { detail: { receiver: this.receiver } });
      wrapper.dispatchEvent(event);
    });

    return wrapper;
  }

  // Limpiar recursos al terminar
  cleanup() {
    // Detener grabación
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    // Dejar de escuchar el WebSocket
    this.wsService.off('audio_stream', this.handleIncomingAudio);

    // Cerrar contexto de audio
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}