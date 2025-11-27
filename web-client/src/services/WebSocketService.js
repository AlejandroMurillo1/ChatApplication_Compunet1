let wsInstance = null;
let listeners = new Map();
let routerInstance = null;

/**
 * Registra un listener para un tipo de evento específico.
 */
export function addListener(eventType, callback) {
    if (!listeners.has(eventType)) {
        listeners.set(eventType, new Set());
    }
    listeners.get(eventType).add(callback);
    console.log(`[WS] Listener agregado para '${eventType}'. Total: ${listeners.get(eventType).size}`);
}

/**
 * Elimina un listener para un tipo de evento específico.
 */
export function removeListener(eventType, callback) {
    if (listeners.has(eventType)) {
        listeners.get(eventType).delete(callback);
        if (listeners.get(eventType).size === 0) {
            listeners.delete(eventType);
        }
        console.log(`[WS] Listener removido para '${eventType}'.`);
    }
}


/**
 * Inicializa y registra la conexión WebSocket para recibir callbacks.
 */
export function initializeWebSocket(userId, router) {
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
        console.log("[WS] La conexión ya está activa.");
        return wsInstance;
    }

    routerInstance = router;

    const WS_URL = "ws://localhost:3001";
    wsInstance = new WebSocket(WS_URL);

    wsInstance.onopen = () => {
        console.log(`[WS] Conexión abierta. Registrando ${userId} para callbacks.`);

        wsInstance.send(JSON.stringify({
            type: 'register_ws',
            userId: userId
        }));
    };

    wsInstance.onmessage = (event) => {
        const message = JSON.parse(event.data);
        const eventType = message.type;
        console.log(`[WS-INCOMING] Mensaje recibido (Type: ${eventType})`, message.data);

        if (listeners.has(eventType)) {
            listeners.get(eventType).forEach(cb => cb(message.data));
        }

        switch (eventType) {
            case 'incoming_call':
                const { callerId, sessionId } = message.data;
                sessionStorage.setItem('incomingCall', JSON.stringify({ callerId, sessionId }));

                if (routerInstance) {
                    routerInstance.navigateTo('/incoming-call');
                    console.log(`[WS] Navegando a /incoming-call para: ${callerId}`);
                } else {
                    console.error("[WS] El objeto router no está disponible para la navegación.");
                    alert(`Llamada entrante de ${callerId}. Session ID: ${sessionId}`);
                }
                break;

            case 'voice_message':
                break;

            case 'call_ended':
                break;

            default:
                console.log(`[WS] Tipo de mensaje desconocido: ${eventType}`);
        }
    };

    wsInstance.onclose = () => {
        console.warn("[WS] Conexión cerrada.");
        wsInstance = null;
        routerInstance = null;
        listeners.clear();
    };

    wsInstance.onerror = (err) => { console.error("[WS] Error de conexión:", err); };

    return wsInstance;
}

/**
 * Cierra la conexión WebSocket. Usado en logout.
 */
export function closeWebSocket() {
    if (wsInstance && wsInstance.readyState !== WebSocket.CLOSED) {
        wsInstance.close();
        wsInstance = null;
        routerInstance = null;
        listeners.clear();
        console.log("[WS] Conexión cerrada por logout.");
    }
}