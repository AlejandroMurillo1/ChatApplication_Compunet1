const {
    getCommunicator,
    ClientCallbackI,
    CALLBACK_ADAPTER_ENDPOINT,
    CALLBACK_ADAPTER_NAME
} = require('../config/ice');

let callbackAdapter = null;
let callbackPrxString = null;

// Inicia el servidor de callback Ice en el Proxy (única vez)
async function startCallbackServer() {
    if (callbackAdapter) return callbackPrxString;

    try {
        const communicator = await getCommunicator();

        // 1. Crear el adaptador para el servidor de callback
        callbackAdapter = communicator.createObjectAdapterWithEndpoints(
            CALLBACK_ADAPTER_NAME,
            CALLBACK_ADAPTER_ENDPOINT
        );

        // 2. Crear el Servant (implementación de la interfaz)
        const servant = new ClientCallbackI();

        // 3. Añadir el Servant al adaptador
        const identity = communicator.stringToIdentity("callback");
        const proxy = callbackAdapter.add(servant, identity);

        // 4. Activar el adaptador para empezar a recibir callbacks
        callbackAdapter.activate();

        // 5. Convertir el Proxy a una string para enviarla al servidor Java
        callbackPrxString = communicator.proxyToString(proxy);

        console.log(`[ICE] Servidor de Callback activo. Escuchando en ${CALLBACK_ADAPTER_ENDPOINT}`);

        return callbackPrxString;

    } catch (error) {
        console.error("[ICE ERROR] Fallo al iniciar el Servidor de Callback:", error);
        throw error;
    }
}

// Registra el callback en el servidor Java
async function registerCallback(clientID) {
    const prxString = await startCallbackServer();
    const voiceChatPrx = await require('./IceClient').getVoiceChatPrx();

    // Llama al método remoto registerClient del servidor Java
    await voiceChatPrx.registerClient(clientID, prxString);
    console.log(`[ICE] Callback registrado en el servidor Java para el cliente: ${clientID}`);
}

module.exports = {
    startCallbackServer,
    registerCallback
};