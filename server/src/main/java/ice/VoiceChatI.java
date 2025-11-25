package ice;

import Chat.ClientCallbackPrx;
import Chat.UdpConnectionInfo;
import Chat.VoiceChat;
import com.zeroc.Ice.Current;

import services.CallService;

public class VoiceChatI implements VoiceChat {

    private final CallService callService;
    private final String serverIP;

    public VoiceChatI(CallService callService, String serverIP) {
        this.callService = callService;
        this.serverIP = serverIP;
    }

    @Override
    public void registerClient(String clientID, ClientCallbackPrx callback, Current current) {
        callService.registerCallback(clientID, callback);
    }

    @Override
    public UdpConnectionInfo requestCall(String fromUser, String toReceiver, Current current) {
        System.out.println("Ice Signal: Call request from " + fromUser + " to " + toReceiver);

        UdpConnectionInfo info = callService.startCall(fromUser, toReceiver, serverIP);

        if (info != null) {
            return info;
        }

        return new UdpConnectionInfo();
    }

    @Override
    public void endCall(String callID, Current current) {
        System.out.println("Ice Signal: Ending call " + callID);
        callService.endCall(callID);
    }

    @Override
    public void sendVoiceMessage(String fromUser, String toReceiver, byte[] audioData, Current current) {
        System.out.println("Ice Signal: Voice Message received from " + fromUser + " for " + toReceiver);

        // 'audioData' YA ES byte[], no se necesita conversión ni List<Byte>
        callService.handleVoiceMessage(fromUser, toReceiver, audioData);
    }
}