// Configuración
const {Ice} = require("ice");
const ICE_SERVER_HOST = "127.0.0.1";
const ICE_SERVER_PORT = 12000;
const VOICE_CHAT_PROXY_STRING = `AudioService:tcp -h ${ICE_SERVER_HOST} -p ${ICE_SERVER_PORT}`;

let communicator = null;
let notifyFrontend = () => {};

async function getCommunicator() {
    if (!communicator) {
        communicator = Ice.initialize();
    }
    return communicator;
}

// Clase base para callbacks (se usará en IceCallbackServer)
class ClientCallbackI extends Ice.Object {
    incomingCall(callerId, sessionId, current) {
        console.log(`[ICE CALLBACK] 📞 Llamada entrante de ${callerId}`);
        notifyFrontend('incoming_call', { callerId, sessionId });
        return Promise.resolve();
    }

    callEnded(sessionId, current) {
        console.log(`[ICE CALLBACK] ❌ Llamada terminada: ${sessionId}`);
        notifyFrontend('call_ended', { sessionId });
        return Promise.resolve();
    }

    voiceMessageReceived(sender, receiver, messageId, current) {
        console.log(`[ICE CALLBACK] 🗣️ Audio recibido de ${sender}`);
        notifyFrontend('voice_message', { sender, messageId, receiver });
        return Promise.resolve();
    }
}

function setFrontendNotifier(callback) {
    notifyFrontend = callback;
}

module.exports = {
    getCommunicator,
    VOICE_CHAT_PROXY_STRING,
    ClientCallbackI,
    setFrontendNotifier
};