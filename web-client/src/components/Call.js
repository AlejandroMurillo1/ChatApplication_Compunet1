import axios from "axios";

export class Call {
  constructor(receiver, sessionId, webSocketUrl, isCaller = true) {
    this.receiver = receiver;
    this.sessionId = sessionId;
    this.webSocketUrl = webSocketUrl;
    this.isCaller = isCaller;

    // Componentes WebRTC
    this.peerConnection = null;
    this.mediaWs = null;
    this.localStream = null;
    this.remoteAudio = null;
  }

  // =========================================================================
  // 1. LÓGICA DE WEBRTC Y WEBSOCKET DE MEDIOS

  async initCallMedia() {
    try {
      this.updateStatus("Obteniendo acceso al micrófono...");
      // A. 1. Obtener audio local
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.updateStatus("Acceso al micrófono OK. Conectando medios...");

      // A. 2. Inicializar PeerConnection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }] // Servidor STUN público
      });

      // A. 3. Agregar pista de audio local
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // B. Configuración de eventos de PeerConnection
      this.peerConnection.ontrack = (event) => {
        this.updateStatus(`Recibiendo ${event.tracks.length} pista(s) remota(s).`);
        // B. 1. Reproducir audio remoto
        this.remoteAudio = new Audio();
        this.remoteAudio.srcObject = event.streams[0];
        this.remoteAudio.play().catch(e => console.error("Error al reproducir audio remoto:", e));
      };

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.mediaWs && this.mediaWs.readyState === WebSocket.OPEN) {
          // B. 2. Enviar candidato ICE al otro par a través del WebSocket de Medios
          this.mediaWs.send(JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate,
            userId: sessionStorage.getItem("username")
          }));
        }
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        console.log("Estado ICE:", this.peerConnection.iceConnectionState);
        this.updateStatus(`Estado de conexión: ${this.peerConnection.iceConnectionState}`);
        if (this.peerConnection.iceConnectionState === 'connected') {
          this.updateStatus("Conexión de audio establecida ✅");
        }
      };

      // C. Iniciar WebSocket de Medios
      this.mediaWs = new WebSocket(this.webSocketUrl);

      this.mediaWs.onopen = async () => {
        this.updateStatus("WebSocket de Medios conectado.");

        // D. CRÍTICO: Crear y enviar la Oferta SOLAMENTE si somos el llamador
        if (this.isCaller) {
          const offer = await this.peerConnection.createOffer();
          await this.peerConnection.setLocalDescription(offer);

          this.mediaWs.send(JSON.stringify({
            type: 'offer',
            sdp: this.peerConnection.localDescription,
            callerId: sessionStorage.getItem("username")
          }));
          this.updateStatus("Oferta enviada. Esperando respuesta...");
        } else {
          this.updateStatus("Esperando oferta de conexión...");
        }
      };


      // E. Manejar mensajes de señalización entrantes (Offer, Answer, ICE Candidate)
      this.mediaWs.onmessage = async (event) => {
        const message = JSON.parse(event.data);

        if (!message || !message.type) return;

        switch (message.type) {
          case 'offer':
            // Si somos el receptor y recibimos una oferta
            if (!this.isCaller) {
              await this.handleOffer(message.sdp);
            }
            break;
          case 'answer':
            // Si somos el llamador y recibimos una respuesta
            if (this.isCaller) {
              await this.handleAnswer(message.sdp);
            }
            break;
          case 'ice-candidate':
            // (Para ambos)
            if (message.userId !== sessionStorage.getItem("username") && message.candidate) {
              try {
                await this.peerConnection.addIceCandidate(message.candidate);
              } catch (e) {
                console.error("Error al agregar candidato ICE:", e);
              }
            }
            break;
        }
      };

      this.mediaWs.onclose = () => {
        this.updateStatus("Conexión de medios cerrada.");
      };

      this.mediaWs.onerror = (err) => {
        console.error("[WS Media Error]", err);
        this.updateStatus("Error de conexión de medios ❌");
      };

    } catch (error) {
      console.error("Error crítico al iniciar medios:", error);
      this.updateStatus(`Error: ${error.message}`);
      this.hangupCall();
    }
  }

  // =========================================================================
  // 2. HANDLERS DE WEBRTC

  async handleOffer(offer) {
    if (this.peerConnection.remoteDescription) return;

    this.updateStatus("Oferta recibida. Enviando respuesta...");

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    // Enviar la respuesta (Answer) de vuelta por el WebSocket de Medios
    this.mediaWs.send(JSON.stringify({
      type: 'answer',
      sdp: this.peerConnection.localDescription,
      userId: sessionStorage.getItem("username")
    }));
  }

  async handleAnswer(answer) {
    if (!this.peerConnection.remoteDescription || this.peerConnection.remoteDescription.type !== 'offer') {
      return;
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    this.updateStatus("Respuesta recibida. Buscando candidatos ICE...");
  }

  // =========================================================================
  // 3. UI y Limpieza
  updateStatus(text) {
    if (this.statusDiv) {
      this.statusDiv.textContent = text;
      console.log(`[Call Status] ${text}`);
    }
  }

  cleanup() {
    console.log("[Call] Limpiando recursos de llamada.");
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.remoteAudio) {
      this.remoteAudio.pause();
      this.remoteAudio = null;
    }
    if (this.mediaWs && this.mediaWs.readyState === WebSocket.OPEN) {
      this.mediaWs.close();
      this.mediaWs = null;
    }
  }

  async hangupCall() {
    this.cleanup();

    const userId = sessionStorage.getItem("username");

    try {
      const response = await axios.post(
          "http://localhost:3001/end_call",
          { userId, sessionId: this.sessionId }
      );
      console.log("Respuesta del proxy /end_call:", response.data);
    } catch (error) {
      console.error("Error al terminar la llamada:", error);
    }

    const event = new CustomEvent("call:hangup", {
      detail: { receiver: this.receiver },
    });
    if (this.wrapper) {
      this.wrapper.dispatchEvent(event);
    } else {
      console.error("Wrapper no encontrado para disparar call:hangup");
    }
  }

  render() {
    this.wrapper = document.createElement("div");
    this.wrapper.classList.add("call-container");

    const info = document.createElement("div");
    info.classList.add("call-info");

    const name = document.createElement("div");
    name.classList.add("call-name");
    name.textContent = this.receiver;

    this.statusDiv = document.createElement("div");
    this.statusDiv.classList.add("call-status");
    this.statusDiv.textContent = "Conectando...";

    info.appendChild(name);
    info.appendChild(this.statusDiv);

    const bottomBar = document.createElement("div");
    bottomBar.classList.add("call-bottom-bar");

    const hangupBtn = document.createElement("button");
    hangupBtn.classList.add("call-end-button");
    hangupBtn.setAttribute("title", "Colgar");
    hangupBtn.innerHTML = `<span class="call-end-icon ">Colgar</span>`;

    hangupBtn.addEventListener("click", () => this.hangupCall());

    bottomBar.appendChild(hangupBtn);

    this.wrapper.appendChild(info);
    this.wrapper.appendChild(bottomBar);

    this.initCallMedia();

    window.addEventListener('beforeunload', this.cleanup.bind(this));
    this.wrapper.addEventListener("call:hangup", this.cleanup.bind(this));


    return this.wrapper;
  }
}
