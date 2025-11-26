const { getCommunicator, VOICE_CHAT_PROXY_STRING } = require('../config/ice');
const Ice = require('ice'); // Importar Ice
const Chat = require('../../Chat'); // CRÍTICO: Importar el módulo generado

let voiceChatPrx = null;

// Inicializa el proxy de la interfaz VoiceChat del servidor Java
async function getVoiceChatPrx() {
    if (!voiceChatPrx) {
        const communicator = await getCommunicator();
        const proxy = communicator.stringToProxy(VOICE_CHAT_PROXY_STRING);

        // El checkedCast ahora usa la clase correcta importada desde Chat.js
        voiceChatPrx = await Chat.VoiceChatPrx.checkedCast(proxy);

        if (!voiceChatPrx) {
            throw new Error("Proxy de VoiceChat no encontrado. Verifique que el servidor Ice (Java) esté activo.");
        }
    }
    return voiceChatPrx;
}

// Lógica de negocio para iniciar una llamada
async function requestCall(fromUser, toReceiver) {
    const prx = await getVoiceChatPrx();
    // Llama al método remoto: requestCall
    const udpInfo = await prx.requestCall(fromUser, toReceiver);
    return udpInfo;
}

// Lógica de negocio para finalizar una llamada
async function endCall(callID) {
    const prx = await getVoiceChatPrx();
    await prx.endCall(callID);
}

// Lógica de negocio para enviar mensaje de voz
async function sendVoiceMessage(fromUser, toReceiver, audioBuffer) {
    const prx = await getVoiceChatPrx();
    await prx.sendVoiceMessage(fromUser, toReceiver, audioBuffer);
}

module.exports = {
    getVoiceChatPrx,
    requestCall,
    endCall,
    sendVoiceMessage
};