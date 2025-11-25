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
import daos.MessageDao; // CRÍTICO: Aseguramos el import
import model.Pair;
import model.Audio; // CRÍTICO: Para crear el objeto de metadatos

public class CallService {

    private final Map<String, MediaFlowHandler> activeHandlers;
    private final Map<String, ClientCallbackPrx> activeCallbacks;
    private final Map<String, Pair<String, String>> callParticipants;

    private final UserDao usersDao;
    private final GroupDao groupDao;
    private final MessageDao messageDao;
    private final AudioProcessor audioProcessor;

    private static final int STARTING_UDP_PORT = 12001;
    private int nextAvailablePort;


    public CallService(UserDao usersDao, GroupDao groupDao, MessageDao messageDao) {
        this.activeHandlers = new HashMap<>();
        this.activeCallbacks = new HashMap<>();
        this.callParticipants = new HashMap<>();
        this.usersDao = usersDao;
        this.groupDao = groupDao;
        this.messageDao = messageDao;
        this.audioProcessor = new AudioProcessor();
        this.nextAvailablePort = STARTING_UDP_PORT;
    }

    // ========================= MÉTODOS ICE (VOICECHAT) =========================

    public synchronized void registerCallback(String clientID, ClientCallbackPrx callback) {
        activeCallbacks.put(clientID, callback);
        System.out.println("Callback registrado para: " + clientID);
    }

    public UdpConnectionInfo requestCall(String fromUser, String toReceiver, String serverIP) throws IOException {
        if (!usersDao.findAllKeys().contains(toReceiver)) {
            // Manejar error: usuario no disponible
            throw new RuntimeException("Receptor no conectado o no existe.");
        }

        String callID = UUID.randomUUID().toString();
        int port = getNextUdpPort();

        // 1. Iniciar el Handler UDP (Relay)
        MediaFlowHandler handler = new MediaFlowHandler(port, callID);
        handler.start();
        activeHandlers.put(callID, handler);

        // 2. Guardar participantes
        callParticipants.put(callID, new Pair<>(fromUser, toReceiver));

        // 3. Crear info de conexión
        UdpConnectionInfo info = new UdpConnectionInfo(serverIP, port, callID);

        // 4. Notificar al receptor (Callback)
        notifyIncomingCall(fromUser, toReceiver, info);

        return info;
    }

    public void endCall(String callID) {
        MediaFlowHandler handler = activeHandlers.remove(callID);
        if (handler != null) {
            handler.stopListening(); // Detener el hilo UDP
            System.out.println("Llamada terminada y handler UDP cerrado: " + callID);

            // Notificar a los participantes
            Pair<String, String> participants = callParticipants.remove(callID);
            if (participants != null) {
                notifyCallEnded(participants.getFirst(), callID); // Notificar al que llamó
                notifyCallEnded(participants.getSecond(), callID); // Notificar al receptor
            }
        }
    }

    //IMPLEMENTACIÓN DE ENVÍO DE VOZ
    public void saveVoiceMessage(String fromUser, String toReceiver, byte[] audioData) {
        try {
            // 1. Guardar el archivo binario en el disco. El AudioProcessor devuelve el ID (nombre del archivo).
            String fileName = audioProcessor.saveAudioBufferAsWav(audioData);

            // 2. Crear el objeto de metadatos (Audio sin bytes)
            Audio audioMetadata = new Audio(fromUser, toReceiver, null);
            // Asignar el ID/FileName al objeto Audio para que MessageDao lo persista
            audioMetadata.setId(Integer.parseInt(fileName.replace(".wav", "")));

            // 3. Persistir la metadata en MessageDao
            messageDao.saveUserMessage(audioMetadata);

            // 4. Notificar al receptor (Callback)
            notifyVoiceMessageReceived(fromUser, toReceiver, fileName);

        } catch (IOException e) {
            System.err.println("Error al guardar el mensaje de voz: " + e.getMessage());
        }
    }


    // ========================= MÉTODOS ICE (CALLBACKS) =========================

    private void notifyIncomingCall(String fromUser, String toReceiver, UdpConnectionInfo info) {
        ClientCallbackPrx receiverCallback = activeCallbacks.get(toReceiver);
        if (receiverCallback != null) {
            receiverCallback.incomingCall(fromUser, info);
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