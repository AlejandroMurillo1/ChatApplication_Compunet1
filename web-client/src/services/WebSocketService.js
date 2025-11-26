export class WebSocketService {
    constructor() {
        this.ws = null;
        this.eventListeners = new Map();
    }

    // Patrón Singleton: Asegura que solo haya UNA conexión WebSocket en toda la app
    static getInstance() {
        if (!WebSocketService.instance) {
            WebSocketService.instance = new WebSocketService();
        }
        return WebSocketService.instance;
    }

    connect(username) {
        // Si ya estamos conectados, no hacemos nada
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        console.log("[WS] Conectando al Proxy...");
        // Conectamos al puerto 3001 (donde corre tu Proxy Node.js)
        this.ws = new WebSocket("ws://localhost:3001");

        this.ws.onopen = () => {
            console.log("[WS] Conectado. Registrando usuario:", username);
            this.send({
                type: "register",
                clientID: username
            });
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // Si alguien (ej. ChatPage o Call) está escuchando este evento, le avisamos
                if (this.eventListeners.has(data.type)) {
                    this.eventListeners.get(data.type).forEach(callback => callback(data));
                }
            } catch (e) {
                console.error("Error procesando mensaje WS:", e);
            }
        };

        this.ws.onclose = () => console.log("[WS] Desconectado");
        this.ws.onerror = (e) => console.error("[WS] Error de conexión:", e);
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn("[WS] No se pudo enviar (Socket cerrado):", data);
        }
    }

    // Permite que otros componentes se suscriban a eventos (ej: 'incomingCall')
    on(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(callback);
    }

    // Permite desuscribirse para evitar duplicados o errores de memoria
    off(eventType, callback) {
        if (!this.eventListeners.has(eventType)) return;
        const listeners = this.eventListeners.get(eventType);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }
}