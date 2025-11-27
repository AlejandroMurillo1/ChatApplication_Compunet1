let wsInstance = null;

/**
 * Inicializa y registra la conexión WebSocket para recibir callbacks.
 */
export function initializeWebSocket(userId, router) {
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
        console.log("[WS] La conexión ya está activa.");
        return wsInstance;
    }

    const WS_URL = "ws://localhost:3001";
    wsInstance = new WebSocket(WS_URL);

    wsInstance.onopen = () => {
        console.log(`[WS] Conexión abierta. Registrando ${userId} para callbacks.`);

        // ⬅️ CRÍTICO: Registrar el usuario en el Proxy para callbacks ICE
        wsInstance.send(JSON.stringify({
            type: 'register_ws',
            userId: userId
        }));
    };

    wsInstance.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log(`[WS-INCOMING] Mensaje recibido (Type: ${message.type})`, message.data);

        // Lógica de manejo de callbacks:
        switch (message.type) {
            case 'incoming_call':
                alert(`Llamada entrante de ${message.data.callerId}. Session ID: ${message.data.sessionId}`);
                // Aquí se podría usar router.navigateTo('/call', ...) si tu router lo permite.
                break;

            case 'voice_message':
                alert(`Nuevo mensaje de voz de ${message.data.sender}. ID: ${message.data.messageId}`);
                // En una app real, aquí se actualizaría la vista del chat.
                break;

            case 'call_ended':
                alert(`Llamada terminada. Session ID: ${message.data.sessionId}`);
                break;

            default:
                console.log(`[WS] Tipo de mensaje desconocido: ${message.type}`);
        }
    };

    wsInstance.onclose = () => { console.warn("[WS] Conexión cerrada."); };
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
        console.log("[WS] Conexión cerrada por logout.");
    }
}