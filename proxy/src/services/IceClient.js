const Ice = require("ice").Ice;
const { getCommunicator, VOICE_CHAT_PROXY_STRING } = require('../config/ice');

// --- IMPORTACIÓN CLAVE ---
const ChatAudio = require('../../Audio').ChatAudio;

let audioServicePrx = null;

async function getAudioServicePrx() {
    if (!audioServicePrx) {
        await initializeProxy();
    }
    return audioServicePrx;
}

async function initializeProxy() {
    try {
        const communicator = await getCommunicator();

        console.log('[ICE CLIENT] Conectando a:', VOICE_CHAT_PROXY_STRING);
        const baseProxy = communicator.stringToProxy(VOICE_CHAT_PROXY_STRING);

        // --- CHECKED CAST ---
        console.log('[ICE CLIENT] Verificando interfaz ChatAudio.AudioService...');

        if (!ChatAudio || !ChatAudio.AudioServicePrx) {
            throw new Error("No se encontró el módulo ChatAudio en proxy/Audio.js. Verifica el nombre del módulo en tu archivo .ice");
        }

        audioServicePrx = await ChatAudio.AudioServicePrx.checkedCast(baseProxy);

        if (!audioServicePrx) {
            throw new Error("checkedCast devolvió null. El servidor Java no está corriendo o no implementa la interfaz correcta.");
        }

        console.log('[ICE CLIENT] ✅ Proxy inicializado y métodos detectados correctamente');

    } catch (error) {
        console.error('[ICE CLIENT] ❌ Error fatal inicializando proxy:', error);
        audioServicePrx = null;
        throw error;
    }
}

// --- MÉTODOS DE NEGOCIO (Ahora usando el proxy casteado) ---

async function sendVoiceMessage(senderId, receiverId, audioBuffer) {
    try {
        const prx = await getAudioServicePrx();
        // Convertimos a Uint8Array para compatibilidad con sequence<byte>
        const audioBytes = new Uint8Array(audioBuffer);

        return await prx.sendVoiceMessage(senderId, receiverId, audioBytes);
    } catch (error) {
        console.error('[ICE CLIENT] Error enviando audio:', error.message);
        throw error;
    }
}

async function getVoiceMessage(messageId) {
    try {
        const prx = await getAudioServicePrx();
        const bytes = await prx.getVoiceMessage(messageId);
        return Buffer.from(bytes); // Convertimos de vuelta a Buffer de Node
    } catch (error) {
        console.error('[ICE CLIENT] Error obteniendo audio:', error.message);
        throw error;
    }
}

async function startCall(callerId, targetId) {
    try {
        const prx = await getAudioServicePrx();
        return await prx.startCall(callerId, targetId);
    } catch (error) {
        console.error('[ICE CLIENT] Error iniciando llamada:', error.message);
        throw error;
    }
}

async function joinCall(userId, sessionId) {
    try {
        const prx = await getAudioServicePrx();
        return await prx.joinCall(userId, sessionId);
    } catch (error) {
        console.error('[ICE CLIENT] Error uniéndose a llamada:', error.message);
        throw error;
    }
}

async function endCall(userId, sessionId) {
    try {
        const prx = await getAudioServicePrx();
        await prx.endCall(userId, sessionId);
    } catch (error) {
        console.error('[ICE CLIENT] Error terminando llamada:', error.message);
        throw error;
    }
}

async function registerClient(userId, callbackProxy) {
    try {
        const prx = await getAudioServicePrx();
        await prx.registerClient(userId, callbackProxy);
        console.log(`[ICE CLIENT] Cliente ${userId} registrado en Java`);
    } catch (error) {
        console.error('[ICE CLIENT] Error registrando cliente:', error.message);
        throw error;
    }
}

// Método de prueba actualizado
async function testAllMethods() {
    try {
        const prx = await getAudioServicePrx();
        console.log('[ICE TEST] Proxy casteado:', prx.constructor.name);

        // Verificamos si los métodos existen en el prototipo
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(prx));
        console.log('[ICE TEST] Métodos disponibles:', methods.filter(m => !m.startsWith('ice_')));

        return { success: true, methods };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    getAudioServicePrx,
    startCall,
    joinCall,
    endCall,
    sendVoiceMessage,
    getVoiceMessage,
    registerClient,
    testAllMethods
};