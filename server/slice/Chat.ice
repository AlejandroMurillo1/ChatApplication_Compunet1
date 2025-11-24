module Chat {
    
    // Estructura que contiene la información necesaria para que el cliente use el servidor UDP
    struct UdpConnectionInfo {
        string serverIP;
        int serverPort;
        string callID; 
    }; 

    // Interfaz de Servicio Remoto (Señalización)
    interface VoiceChat {

        UdpConnectionInfo requestCall(string fromUser, string toReceiver);

        void endCall(string callID); 
        
        // Paso 2: Usar el nuevo struct en la firma del método
        void sendVoiceMessage(string fromUser, string toReceiver, sequence<octet> audioBuffer);
    };
};