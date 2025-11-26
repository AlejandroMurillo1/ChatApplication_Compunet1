package ice;

import Chat.CallInfo;
import Chat.ClientCallbackPrx;
import Chat.VoiceChat;
import com.zeroc.Ice.Current;

import services.CallService;

public class VoiceChatI implements VoiceChat {

    private final CallService callService;

    public VoiceChatI(CallService callService) {
        this.callService = callService;
    }

    @Override
    public void registerClient(String clientID, ClientCallbackPrx callback, Current current) {
        callService.registerCallback(clientID, callback);
    }

    @Override
    public CallInfo requestCall(String fromUser, String toReceiver, Current current) {
        return callService.requestCall(fromUser, toReceiver);
    }

    @Override
    public void endCall(String callID, Current current) {
        callService.endCall(callID);
    }

    @Override
    public void sendVoiceMessage(String fromUser, String toReceiver, byte[] audioData, Current current) {
        callService.saveVoiceMessage(fromUser, toReceiver, audioData);
    }
}