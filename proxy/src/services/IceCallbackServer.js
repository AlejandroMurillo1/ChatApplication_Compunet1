// IceCallbackServer.js
const Ice = require("ice").Ice;
const { getCommunicator, ClientCallbackI } = require('../config/ice');
const iceClient = require('./IceClient');

// IMPORTAR LA DEFINICIÓN GENERADA (Igual que en IceClient)
const ChatAudio = require('../../Audio').ChatAudio;

let callbackAdapter = null;
const userServants = new Map();

/**
 * Inicializa el adaptador sin endpoints
 */
async function initializeCallbackAdapter() {
    if (callbackAdapter) return callbackAdapter;

    try {
        const communicator = await getCommunicator();
        callbackAdapter = communicator.createObjectAdapter("");
        console.log(`[ICE CALLBACK] Adaptador sin endpoints creado`);
        return callbackAdapter;

    } catch (error) {
        console.error("[ICE ERROR] Fallo al crear adaptador:", error);
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

        // Configurar conexión bidireccional
        try {
            const connection = await serverPrx.ice_getConnection();
            if (connection) {
                await connection.setAdapter(adapter);
                console.log(`[ICE CALLBACK] ✅ Conexión bidireccional establecida para ${userId}`);
            }
        } catch (bidirError) {
            console.log(`[ICE CALLBACK] ⚠️  Bidireccional no disponible: ${bidirError.message}`);
        }

        // Crear servant
        const servant = new ClientCallbackI();
        userServants.set(userId, servant);

        const identity = new Ice.Identity();
        identity.name = `callback_${userId}`;
        identity.category = "";

        // Añadir al adaptador
        adapter.add(servant, identity);

        // Crear el proxy del callback
        const baseCallbackProxy = adapter.createDirectProxy(identity);

        // --- MEJORA: HACER CAST AL PROXY DEL CALLBACK ---
        // Esto asegura que enviamos a Java exactamente lo que espera (AudioClientCallbackPrx)
        const callbackProxy = ChatAudio.AudioClientCallbackPrx.uncheckedCast(baseCallbackProxy);

        // Registrar en servidor Java
        await serverPrx.registerClient(userId, callbackProxy);

        console.log(`[ICE CALLBACK] ✅ Usuario ${userId} registrado exitosamente`);
        return true;

    } catch (error) {
        console.error(`[ICE ERROR] ❌ Fallo al registrar usuario ${userId}:`, error.message);
        // ... (resto del manejo de error)
        return false;
    }
}

// Las funciones cleanupUser, unregisterUserForCallbacks, getStatus, shutdown se mantienen igual

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
    console.log('[ICE CALLBACK] Recursos liberados');
}

module.exports = {
    registerUserForCallbacks,
    unregisterUserForCallbacks,
    getStatus,
    shutdown
};