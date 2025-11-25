module Chat {

    // Solución para el compilador: Declarar el tipo de secuencia globalmente
    sequence<byte> AudioBuffer;
    struct UdpConnectionInfo {
        string serverIP;
        int serverPort;
        string callID;
    };

    // Esta interfaz la implementa el web-client para que el Server pueda llamarlo.
    interface ClientCallback {

        // Notifica al cliente receptor que tiene una llamada entrante.
        void incomingCall(string callerName, UdpConnectionInfo info);

        // Notifica a los participantes que la llamada ha sido terminada por el otro lado.
        void callEnded(string callID);

        // Notificación de mensaje de voz (futura funcionalidad)
        void voiceMessageReceived(string sender, string groupOrUser, string fileName);
    };

    interface VoiceChat {

        // Permite al cliente registrar su proxy de callback en el servidor.
        void registerClient(string clientID, ClientCallback* callback);

        // Método llamado por el usuario A para iniciar la llamada.
        UdpConnectionInfo requestCall(string fromUser, string toReceiver);

        void endCall(string callID);

        // Para mensajes de voz (persistencia)
        void sendVoiceMessage(string fromUser, string toReceiver, AudioBuffer audioData);
    };
};