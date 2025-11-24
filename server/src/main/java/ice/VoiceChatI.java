package ice;

import Chat.UdpConnectionInfo;
import Chat.VoiceChat;
import com.zeroc.Ice.Current; 

import model.Pair;
import services.CallService;

public class VoiceChatI implements VoiceChat {
    private final CallService callService;
    private final String serverIP; 
    
    // IP del servidor, que será usada por el cliente para la conexión UDP
    public VoiceChatI(CallService callService, String serverIP) {
        this.callService = callService;
        this.serverIP = serverIP; 
    }

    @Override
    public UdpConnectionInfo requestCall(String fromUser, String toReceiver, Current current) {
        System.out.println("Ice Signal: Call request from " + fromUser + " to " + toReceiver);

        Pair<String, Integer> result = callService.startCall(fromUser, toReceiver);

        if (result != null) {
            UdpConnectionInfo info = new UdpConnectionInfo();
            info.serverIP = this.serverIP;
            info.serverPort = result.getSecond(); 
            info.callID = result.getFirst(); 
            
            System.out.println("Ice Signal: Call " + info.callID + " assigned port " + info.serverPort);
            return info;
        }

        // Devolver una estructura vacía o con error si falla
        return new UdpConnectionInfo(); 
    }

    @Override
    public void endCall(String callID, Current current) {
        System.out.println("Ice Signal: Ending call " + callID);
        
        if (callService.endCall(callID)) {
            System.out.println("Call " + callID + " successfully terminated.");
        } else {
            System.err.println("Warning: Attempted to end non-existent call " + callID);
        }
    }

    @Override
    public void sendVoiceMessage(String fromUser, String toReceiver, byte[] audioData, Current current) {
        // REQUERIMIENTO 4: Solo interfaz, sin implementación funcional.
        System.out.println("Ice Signal: Voice Message received from " + fromUser + 
                           " for " + toReceiver + ". Functionality not implemented.");
    }
}