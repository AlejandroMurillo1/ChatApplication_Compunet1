// pages/IncomingCallPage.js
import axios from "axios";
import { Call } from "../components/Call.js"; // Importar el componente Call
import { addListener, removeListener } from "../services/WebSocketService.js"; // Para escuchar si la llamada es colgada por el llamador

export class IncomingCallPage {
    constructor(router) {
        this.router = router;
        this.callerId = null;
        this.sessionId = null;
        this.wrapper = null;
        this.currentCallComponent = null; // Para mantener la referencia a la llamada activa
    }

    async render() {
        this.wrapper = document.createElement("div");
        this.wrapper.classList.add("incoming-call-container");

        // Intentar recuperar la información de la llamada entrante de sessionStorage
        const incomingCallInfo = JSON.parse(sessionStorage.getItem('incomingCall'));
        if (!incomingCallInfo) {
            this.wrapper.innerHTML = `
        <div class="incoming-call-box">
          <h2>No hay llamada entrante activa.</h2>
          <button id="backToChatBtn">Volver al Chat</button>
        </div>
      `;
            this.wrapper.querySelector('#backToChatBtn').addEventListener('click', () => {
                this.router.navigateTo("/chat");
            });
            return this.wrapper;
        }

        this.callerId = incomingCallInfo.callerId;
        this.sessionId = incomingCallInfo.sessionId;

        // Limpiar sessionStorage inmediatamente después de usarlo
        sessionStorage.removeItem('incomingCall');


        this.wrapper.innerHTML = `
      <div class="incoming-call-box">
        <div class="call-icon">📞</div>
        <h2>Llamada entrante de <span id="callerName">${this.callerId}</span></h2>
        <div class="call-actions">
          <button id="acceptCallBtn" class="accept-button">Aceptar</button>
          <button id="rejectCallBtn" class="reject-button">Rechazar</button>
        </div>
        <div id="callStatus" class="call-status"></div>
      </div>
    `;

        // Asignar eventos a los botones
        this.wrapper.querySelector("#acceptCallBtn").addEventListener("click", () => this.acceptCall());
        this.wrapper.querySelector("#rejectCallBtn").addEventListener("click", () => this.rejectCall());

        // ⬅️ CRÍTICO: Escuchar si el llamador cuelga antes de que el receptor acepte
        // Usaremos el listener de WebSocketService que definiremos en el siguiente paso
        addListener('call_ended', this.handleCallEndedFromSignaling);

        return this.wrapper;
    }

    // Manejador para cuando el llamador cuelga antes de que el receptor acepte
    handleCallEndedFromSignaling = (data) => {
        if (data.sessionId === this.sessionId) {
            console.log(`Llamada ${this.sessionId} terminada por el otro lado.`);
            this.updateStatus("Llamada terminada por el llamador.");
            // Dar un pequeño delay para que el usuario lea el mensaje antes de volver al chat
            setTimeout(() => this.router.navigateTo("/chat"), 2000);
        }
    };


    async acceptCall() {
        this.updateStatus("Aceptando llamada...");
        const userId = sessionStorage.getItem("username");

        try {
            const response = await axios.post(
                "http://localhost:3001/join_call",
                { userId, sessionId: this.sessionId }
            );
            console.log("Respuesta del proxy /join_call:", response.data);

            const { sessionId, webSocketUrl } = response.data.data;

            // ⬅️ CRÍTICO: Renderizar el componente Call y pasar isCaller: false
            this.currentCallComponent = new Call(this.callerId, sessionId, webSocketUrl, false); // isCaller es false para el receptor
            const callElement = this.currentCallComponent.render();

            // Reemplazar la interfaz de llamada entrante con la interfaz de llamada activa
            this.wrapper.innerHTML = ''; // Limpiar el contenido actual
            this.wrapper.appendChild(callElement);

            // Escuchar el evento de colgado desde el componente Call
            callElement.addEventListener("call:hangup", () => {
                console.log("Llamada colgada desde el componente Call.");
                this.router.navigateTo("/chat");
            });

        } catch (error) {
            console.error("Error al unirse a la llamada:", error);
            this.updateStatus("Error al aceptar la llamada.");
            // Revertir a la página de chat si falla
            setTimeout(() => this.router.navigateTo("/chat"), 2000);
        }
    }

    async rejectCall() {
        this.updateStatus("Rechazando llamada...");
        const userId = sessionStorage.getItem("username");

        try {
            // Llamar al endpoint /end_call para informar al servidor que se rechazó
            await axios.post(
                "http://localhost:3001/end_call",
                { userId, sessionId: this.sessionId }
            );
            console.log("Llamada rechazada.");
            this.updateStatus("Llamada rechazada.");
            setTimeout(() => this.router.navigateTo("/chat"), 1000);
        } catch (error) {
            console.error("Error al rechazar la llamada:", error);
            this.updateStatus("Error al rechazar la llamada.");
            setTimeout(() => this.router.navigateTo("/chat"), 2000);
        }
    }

    updateStatus(message) {
        const statusDiv = this.wrapper.querySelector("#callStatus");
        if (statusDiv) {
            statusDiv.textContent = message;
        }
        console.log(`[IncomingCallPage Status] ${message}`);
    }

    // Método de limpieza
    cleanup() {
        console.log("[IncomingCallPage] Limpiando recursos.");
        // Remover el listener del WebSocketService cuando la página se va
        removeListener('call_ended', this.handleCallEndedFromSignaling);

        // Asegurarse de limpiar el componente Call si está activo
        if (this.currentCallComponent) {
            this.currentCallComponent.cleanup();
            this.currentCallComponent = null;
        }
        this.callerId = null;
        this.sessionId = null;
        if (this.wrapper) {
            this.wrapper.innerHTML = '';
        }
    }
}