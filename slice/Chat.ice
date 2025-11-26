module Chat {

    // Secuencia de bytes para los mensajes de voz (persistencia)
    sequence<byte> AudioBuffer;

    struct CallInfo {
        string callID;
        string status;
    };

    interface ClientCallback {
        // El Proxy Node recibe esto y emite un evento socket.io al cliente destino
        void incomingCall(string callerName, string callID);

        void callEnded(string callID);

        // Agregamos fileName para que el cliente sepa qué descargar
        void voiceMessageReceived(string sender, string groupOrUser, string fileName);
    };

    interface VoiceChat {
        void registerClient(string clientID, ClientCallback* callback);

        // Java solo valida y genera el ID. No gestiona la conexión de red de audio.
        CallInfo requestCall(string fromUser, string toReceiver);

        void endCall(string callID);

        // Persistencia de audio
        void sendVoiceMessage(string fromUser, string toReceiver, AudioBuffer audioData);
    };
};