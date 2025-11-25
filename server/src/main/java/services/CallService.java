package services;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

// Importar clases generadas por Slice (ClientCallbackPrx, UdpConnectionInfo, etc.)
import Chat.ClientCallbackPrx;
import Chat.UdpConnectionInfo;

import audio.AudioProcessor;
import audio.MediaFlowHandler;
import daos.GroupDao;
import daos.UserDao;
import model.Pair;

public class CallService {

    private final Map<String, MediaFlowHandler> activeHandlers;
    private final Map<String, ClientCallbackPrx> activeCallbacks; // Para el patrón Observer
    private final Map<String, Pair<String, String>> callParticipants;

    private final UserDao usersDao;
    private final GroupDao groupDao;
    private final AudioProcessor audioProcessor;

    private static final int STARTING_UDP_PORT = 12001;
    private int nextAvailablePort;


    public CallService(UserDao usersDao, GroupDao groupDao) {
        this.activeHandlers = new HashMap<>();
        this.activeCallbacks = new HashMap<>();
        this.callParticipants = new HashMap<>();
        this.usersDao = usersDao;
        this.groupDao = groupDao;
        this.audioProcessor = new AudioProcessor();
        this.nextAvailablePort = STARTING_UDP_PORT;
    }

    // ========================= MÉTODOS ICE (CALLBACKS) =========================

    public synchronized void registerCallback(String clientID, ClientCallbackPrx callback) {
        activeCallbacks.put(clientID, callback);
        System.out.println("Client callback registered for: " + clientID);
    }

    public synchronized void unregisterCallback(String clientID) {
        activeCallbacks.remove(clientID);
        System.out.println("Client callback unregistered for: " + clientID);
    }

    // ========================= MÉTODOS ICE (SEÑALIZACIÓN) =========================

    public UdpConnectionInfo startCall(String fromUser, String toReceiver, String serverIP) {
        if (usersDao.findById(fromUser) == null) return null;
        if (usersDao.findById(toReceiver) == null && groupDao.findById(toReceiver) == null) {
            System.err.println("Receiver " + toReceiver + " not found.");
            return null;
        }

        String callID = UUID.randomUUID().toString();
        int port = getNextUdpPort();

        try {
            MediaFlowHandler handler = new MediaFlowHandler(port, callID, fromUser, toReceiver, usersDao, groupDao);
            handler.start();

            activeHandlers.put(callID, handler);
            callParticipants.put(callID, new Pair<>(fromUser, toReceiver));

            UdpConnectionInfo info = new UdpConnectionInfo();
            info.serverIP = serverIP;
            info.serverPort = port;
            info.callID = callID;

            // Notificar al receptor (Observer Pattern)
            notifyIncomingCall(fromUser, toReceiver, info);

            System.out.println("Call initiated: " + callID + " on UDP port " + port);
            return info;

        } catch (IOException e) {
            System.err.println("Error starting MediaFlowHandler: " + e.getMessage());
            return null;
        }
    }

    public boolean endCall(String callID) {
        MediaFlowHandler handler = activeHandlers.remove(callID);
        if (handler != null) {
            handler.stopListening();

            // Notificar a todos los participantes que la llamada ha terminado
            Pair<String, String> participants = callParticipants.remove(callID);
            if (participants != null) {
                notifyCallEnded(participants.getFirst(), callID); // Notificar al que llamó
                notifyCallEnded(participants.getSecond(), callID); // Notificar al receptor/grupo
            }

            System.out.println("Call ended: " + callID + ".");
            return true;
        }
        return false;
    }

    // ========================= LÓGICA DE AUDIO =========================

    public void handleVoiceMessage(String fromUser, String toReceiver, byte[] audioData) {
        try {
            String fileName = audioProcessor.saveAudioBufferAsWav(audioData);

            // Notificar al receptor (si está en línea)
            notifyVoiceMessageReceived(fromUser, toReceiver, fileName);

            System.out.println("Voice message from " + fromUser + " to " + toReceiver + " saved as: " + fileName);

        } catch (IOException e) {
            System.err.println("Failed to save voice message.");
        }
    }

    // ========================= MÉTODOS AUXILIARES =========================

    private void notifyIncomingCall(String fromUser, String toReceiver, UdpConnectionInfo info) {
        // Lógica simplificada: solo notificamos si es P2P. Para grupos, se notifican a todos los miembros.
        ClientCallbackPrx receiverCallback = activeCallbacks.get(toReceiver);

        if (receiverCallback != null) {
            receiverCallback.incomingCall(fromUser, info);
            System.out.println("Callback: Incoming call notification sent to " + toReceiver);
        } else {
            System.out.println("Warning: Receiver " + toReceiver + " not available for callback.");
        }
    }

    private void notifyCallEnded(String clientID, String callID) {
        ClientCallbackPrx callback = activeCallbacks.get(clientID);
        if (callback != null) {
            try {
                callback.callEnded(callID);
            } catch (com.zeroc.Ice.Exception e) {
                System.err.println("Callback failed for " + clientID + ". Removing proxy.");
                activeCallbacks.remove(clientID);
            }
        }
    }

    private void notifyVoiceMessageReceived(String sender, String receiver, String fileName) {
        // Lógica similar a notifyIncomingCall, usando ClientCallbackPrx.voiceMessageReceived
        ClientCallbackPrx receiverCallback = activeCallbacks.get(receiver);
        if (receiverCallback != null) {
            receiverCallback.voiceMessageReceived(sender, receiver, fileName);
            System.out.println("Callback: Voice message notification sent to " + receiver);
        }
    }

    private int getNextUdpPort() {
        return nextAvailablePort++;
    }
}