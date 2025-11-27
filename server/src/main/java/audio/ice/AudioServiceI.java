package audio.ice;

import ChatAudio.AudioClientCallbackPrx;
import ChatAudio.AudioService;
import ChatAudio.CallInfo;
import audio.service.AudioServiceImpl;
import com.zeroc.Ice.Current;

public class AudioServiceI implements AudioService {

    private final AudioServiceImpl audioService;
    private final AudioClientManager clientManager;
    private final String serverIP;

    public AudioServiceI(AudioServiceImpl audioService, AudioClientManager clientManager, String serverIP) {
        this.audioService = audioService;
        this.clientManager = clientManager;
        this.serverIP = serverIP;
    }

    // ================== IMPLEMENTACIÓN DE AUDIOS ==================

    @Override
    public String sendVoiceMessage(String fromUser, String toReceiver, byte[] audioData, Current current) {
        return audioService.handleSendVoiceMessage(fromUser, toReceiver, audioData);
    }

    @Override
    public byte[] getVoiceMessage(String messageId, Current current) {
        return audioService.handleGetVoiceMessage(messageId);
    }

    // ================== IMPLEMENTACIÓN DE LLAMADAS ==================

    @Override
    public CallInfo startCall(String fromUser, String toReceiver, Current current) {
        return audioService.handleStartCall(fromUser, toReceiver, serverIP);
    }

    @Override
    public CallInfo joinCall(String userId, String sessionId, Current current) {
        return audioService.handleJoinCall(userId, sessionId, serverIP);
    }

    @Override
    public void endCall(String userId, String sessionId, Current current) {
        audioService.handleEndCall(sessionId);
    }

    // ================== IMPLEMENTACIÓN DE CALLBACKS ==================

    @Override
    public void registerClient(String userId, AudioClientCallbackPrx callback, Current current) {
        clientManager.registerCallback(userId, callback);
    }
}
