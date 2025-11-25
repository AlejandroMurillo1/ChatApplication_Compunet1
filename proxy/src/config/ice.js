const Ice = require("ice");

// Direcciones para la comunicación con el servidor Java (Backend)
// Puerto 12000: Servidor Ice (VoiceChat) en Java
const VOICE_CHAT_PROXY_STRING = "VoiceChat:tcp -h 127.0.0.1 -p 12000";

// Puerto 12002: Proxy Node.js (ClientCallback) esperando llamadas de Java
const CALLBACK_ADAPTER_ENDPOINT = "tcp -h 127.0.0.1 -p 12002";
const CALLBACK_ADAPTER_NAME = "ClientCallbackAdapter";

// Función para obtener una instancia única del Comunicador Ice
let communicatorInstance = null;
async function getCommunicator() {
    if (!communicatorInstance) {
        communicatorInstance = Ice.initialize();
    }
    return communicatorInstance;
}

// Implementación de la interfaz de Callback (ClientCallback)
// NOTA: Esta clase asume que los stubs de Ice ya fueron generados en Node.js.
class ClientCallbackI extends Ice.Chat.ClientCallback {

    // Implementación del método incomingCall (Llamada entrante)
    incomingCall(callerName, info, current) {
        console.log(`[ICE CALLBACK] 📞 LLAMADA ENTRANTE de: ${callerName}`);
        console.log(`               ID de Llamada: ${info.callID}, Puerto UDP: ${info.serverPort}`);

        // Aquí iría la lógica para enviar una notificación WebSocket al Web Client
    }

    // Implementación de callEnded (Llamada terminada)
    callEnded(callID, current) {
        console.log(`[ICE CALLBACK] ❌ LLAMADA TERMINADA: ${callID}`);
        // Aquí iría la lógica para notificar al Web Client
    }

    // Implementación de voiceMessageReceived
    voiceMessageReceived(sender, groupOrUser, fileName, current) {
        console.log(`[ICE CALLBACK] 🗣️ Mensaje de voz recibido de ${sender} para ${groupOrUser}. Archivo: ${fileName}`);
        // Aquí iría la lógica para notificar al Web Client
    }
}

module.exports = {
    getCommunicator,
    VOICE_CHAT_PROXY_STRING,
    CALLBACK_ADAPTER_ENDPOINT,
    CALLBACK_ADAPTER_NAME,
    ClientCallbackI
};