const Ice = require("ice").Ice;
const { ClientCallbackI, ICE_CALLBACK_PORT } = require('../config/ice');
const iceClient = require('./IceClient');
const ChatAudio = require('../../Audio').ChatAudio;

let callbackAdapter = null;
const userServants = new Map();
let callbackCommunicator = null;

/**
 * Inicializa el adaptador sin endpoints
 */
async function initializeCallbackAdapter() {
    if (callbackAdapter) return callbackAdapter;

    try {
        // 1. Configurar propiedades del comunicador para el adaptador
        const initData = new Ice.InitializationData();
        initData.properties = Ice.createProperties();
        const CALLBACK_ENDPOINT = `tcp -h 127.0.0.1 -p ${ICE_CALLBACK_PORT}`;

        initData.properties.setProperty("CallbackAdapter.Endpoints", CALLBACK_ENDPOINT);

        // 2. Inicializar un nuevo comunicador local con las propiedades
        callbackCommunicator = Ice.initialize(initData);

        // 3. Crear el adaptador por nombre (usará la propiedad definida)
        callbackAdapter = callbackCommunicator.createObjectAdapter("CallbackAdapter");

        try {
            callbackAdapter.activate();
        } catch (e) {
            console.warn("[ICE CALLBACK] adapter.activate() no disponible, continuando.");
        }

        console.log(`[ICE CALLBACK] Adaptador activado en: ${CALLBACK_ENDPOINT}`);
        return callbackAdapter;

    } catch (error) {
        console.error("[ICE ERROR] Fallo al crear adaptador:", error.message);
        throw error;
    }
}

/**
 * Registra usuario para callbacks
 */
async function registerUserForCallbacks(userId) {
    try {
        console.log(`[ICE CALLBACK] Registrando callbacks para usuario: ${userId}`);

        const adapter = await initializeCallbackAdapter();
        const serverPrx = await iceClient.getAudioServicePrx();

        // Crear servant
        const servant = new ClientCallbackI();
        userServants.set(userId, servant);

        const identity = new Ice.Identity();
        identity.name = `callback_${userId}`;
        identity.category = "";

        // Añadir al adaptador
        adapter.add(servant, identity);

        const callbackProxy = adapter.createProxy(identity);

        // Hacer cast al proxy
        const finalCallbackProxy = ChatAudio.AudioClientCallbackPrx.uncheckedCast(callbackProxy);

        // Registrar en servidor Java
        await serverPrx.registerClient(userId, finalCallbackProxy);

        console.log(`[ICE CALLBACK] ✅ Usuario ${userId} registrado exitosamente`);
        return true;

    } catch (error) {
        console.error(`[ICE ERROR] ❌ Fallo al registrar usuario ${userId}:`, error.message);
        return false;
    }
}

function cleanupUser(userId) {
    if (callbackAdapter && userServants.has(userId)) {
        try {
            const identity = new Ice.Identity();
            identity.name = `callback_${userId}`;
            identity.category = "";
            callbackAdapter.remove(identity);
        } catch (removeError) {
            // Ignorar
        }
    }
    userServants.delete(userId);
}

async function unregisterUserForCallbacks(userId) {
    cleanupUser(userId);
    console.log(`[ICE CALLBACK] Usuario ${userId} desregistrado`);
}

function getStatus() {
    return {
        adapterActive: !!callbackAdapter,
        registeredUsers: Array.from(userServants.keys()),
        totalUsers: userServants.size
    };
}

async function shutdown() {
    const userIds = Array.from(userServants.keys());
    userIds.forEach(userId => cleanupUser(userId));

    if (callbackAdapter) {
        callbackAdapter.destroy();
        callbackAdapter = null;
    }
    if (callbackCommunicator) { // Limpia el comunicador local
        await callbackCommunicator.shutdown();
        await callbackCommunicator.destroy();
        callbackCommunicator = null;
    }
    console.log('[ICE CALLBACK] Recursos liberados');
}

module.exports = {
    registerUserForCallbacks,
    unregisterUserForCallbacks,
    getStatus,
    shutdown
};