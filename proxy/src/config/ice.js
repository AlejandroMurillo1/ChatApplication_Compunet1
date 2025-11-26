const Ice = require("ice").Ice;
const Chat = require("../../Chat").Chat;

// Puerto 12000: Servidor Ice (VoiceChat) en Java
const VOICE_CHAT_PROXY_STRING = "VoiceChat:tcp -h 127.0.0.1 -p 12000";

// Puerto 12002: Proxy Node.js (ClientCallback) esperando llamadas de Java
const CALLBACK_ADAPTER_ENDPOINT = "tcp -h 127.0.0.1 -p 12002";
const CALLBACK_ADAPTER_NAME = "ClientCallbackAdapter";

let communicatorInstance = null;

async function getCommunicator() {
    if (!communicatorInstance) {
        // Inicialización simple. La configuración de red se hará en el servidor de callbacks.
        communicatorInstance = Ice.initialize();
    }
    return communicatorInstance;
}

class ClientCallbackI extends Chat.ClientCallback {

    getWSClients() {

        return global.app?.locals?.clients;
    }

    broadcastEvent(clientID, type, payload) {
        const WebSocket = require('ws');
        const clients = this.getWSClients();

        if (!clients) {
            console.log("[Ice Error] No se pudo acceder a la lista de clientes WS.");
            return;
        }

        const ws = clients.get(clientID);

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type, payload }));
            console.log(`[Proxy -> WS] Evento '${type}' enviado al usuario: ${clientID}`);
        } else {
            console.log(`[Proxy Warning] Usuario ${clientID} no conectado o socket cerrado.`);
        }
    }

    //Llamada entrante
    incomingCall(callerName, callID, current) {
        console.log(`[Ice Recibido] 📞 Llamada de ${callerName} (ID: ${callID})`);

        // Notificamos al cliente web destinatario (current.id.name es el userID)
        this.broadcastEvent(current.id.name, 'incomingCall', {
            callerName: callerName,
            callID: callID
        });
    }

    //Llamada Finalizada
    callEnded(callID, current) {
        console.log(`[Ice Recibido] ❌ Fin de llamada: ${callID}`);
        this.broadcastEvent(current.id.name, 'callEnded', { callID });
    }

    //Mensaje de Voz Recibido
    voiceMessageReceived(sender, groupOrUser, fileName, current) {
        console.log(`[Ice Recibido] 🗣️ Audio nuevo: ${fileName}`);

        // Enviamos la URL de descarga directa al cliente
        this.broadcastEvent(current.id.name, 'voiceMessageReceived', {
            sender: sender,
            // El cliente usará esta URL para reproducir el audio
            downloadUrl: `/api/audio/${fileName}`,
            fileName: fileName
        });
    }
}

module.exports = {
    getCommunicator,
    ClientCallbackI,
    VOICE_CHAT_PROXY_STRING,
    CALLBACK_ADAPTER_ENDPOINT,
    CALLBACK_ADAPTER_NAME
};