const {
    getCommunicator,
    ClientCallbackI,
    CALLBACK_ADAPTER_ENDPOINT,
    CALLBACK_ADAPTER_NAME
} = require('../config/ice');

let callbackAdapter = null;
let callbackPrxString = null;

// =========================================================
// FUNCIÓN 1: Iniciar el servidor de callback
// =========================================================
async function startCallbackServer() {
    if (callbackAdapter) return callbackPrxString;

    try {
        const communicator = await getCommunicator();

        callbackAdapter = communicator.createObjectAdapter(CALLBACK_ADAPTER_NAME);

        // 3. Crear e instalar el Servant
        const servant = new ClientCallbackI();
        const identity = communicator.stringToIdentity("callback");
        // .add() ahora funciona porque callbackAdapter es un objeto válido
        const proxy = callbackAdapter.add(servant, identity);

        // 4. Activar
        await callbackAdapter.activate();

        // 5. Generar Proxy String final para enviar a Java
        callbackPrxString = communicator.proxyToString(proxy) +
            " " + CALLBACK_ADAPTER_ENDPOINT;

        console.log(`[ICE] Servidor de Callback activo. Proxy string: ${callbackPrxString}`);

        return callbackPrxString;

    } catch (error) {
        // En caso de fallo (ej. puerto 12002 ya en uso), el error será capturado aquí.
        console.error("[ICE ERROR] Fallo al iniciar el Servidor de Callback:", error);
        throw error;
    }
}

// =========================================================
// FUNCIÓN 2: Registrar en el servidor Java
// =========================================================
async function registerCallback(clientID) {
    // 1. Asegurar que el servidor de callbacks esté escuchando
    const prxString = await startCallbackServer();

    // 2. Obtener el proxy de Java
    const voiceChatPrx = await require('./IceClient').getVoiceChatPrx();

    // 3. Llamar a Java con la identidad del cliente y nuestro proxy string
    await voiceChatPrx.registerClient(clientID, prxString);
    console.log(`[ICE] Callback registrado en el servidor Java para el cliente: ${clientID}`);
}

module.exports = {
    startCallbackServer,
    registerCallback
};