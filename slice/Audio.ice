module ChatAudio
{
    sequence<byte> AudioBytes;

    struct CallInfo {
        string sessionId;
        string webSocketUrl;
    };

    interface AudioClientCallback
    {
        void incomingCall(string callerId, string sessionId);
        void callEnded(string sessionId);
        void voiceMessageReceived(string sender, string receiver, string messageId);
    };

    interface AudioService
    {
        // Mensajes de Voz
        string sendVoiceMessage(string senderId, string receiverIdOrGroupId, AudioBytes audioData);
        AudioBytes getVoiceMessage(string messageId);

        // Llamadas (Señalización)
        CallInfo startCall(string callerId, string targetIdOrGroupId);
        CallInfo joinCall(string userId, string sessionId);
        void endCall(string userId, string sessionId);

        // Gestión de Callbacks
        void registerClient(string userId, AudioClientCallback* callback);
    };
};