package audio.service;

import ChatAudio.CallInfo;
import audio.AudioProcessor;
import audio.CallSession;
import audio.ice.AudioClientManager;
import daos.GroupDao;
import daos.MessageDao;
import daos.UserDao;
import model.Audio;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class AudioServiceImpl {

    private final UserDao usersDao;
    private final GroupDao groupDao;
    private final MessageDao messageDao;
    private final Map<String, CallSession> activeCallSessions;
    private final AudioClientManager callbackManager;
    private final AudioProcessor audioProcessor; // Usamos esto para la ruta del disco

    public AudioServiceImpl(UserDao usersDao, GroupDao groupDao, MessageDao messageDao, AudioClientManager callbackManager) {
        this.usersDao = usersDao;
        this.groupDao = groupDao;
        this.messageDao = messageDao;
        this.callbackManager = callbackManager;
        this.audioProcessor = new AudioProcessor();
        this.activeCallSessions = new HashMap<>();
    }

    // ====================== MENSAJES DE VOZ (ICE) ======================

    public String handleSendVoiceMessage(String fromUser, String toReceiver, byte[] audioData) {
        try {
            String fileName = audioProcessor.saveAudioBufferAsWav(audioData);
            Audio audioMsg = new Audio(fromUser, toReceiver, audioData);

            if (groupDao.findById(toReceiver) != null) {
                messageDao.saveGroupMessage(audioMsg);
            } else {
                messageDao.saveUserMessage(audioMsg);
            }

            String messageId = String.valueOf(audioMsg.getId());

            callbackManager.notifyVoiceMessageReceived(fromUser, toReceiver, messageId);

            System.out.println("Voice message persisted with ID: " + messageId);
            return messageId;

        } catch (IOException e) {
            System.err.println("Failed to save voice message: " + e.getMessage());
            return null;
        }
    }

    /**
     * Implementa la recuperación de bytes de un mensaje de voz por su ID.
     */
    public byte[] handleGetVoiceMessage(String messageIdStr) {
        try {
            int messageId = Integer.parseInt(messageIdStr);
            Audio audioFull = messageDao.findAudioById(messageId);

            if (audioFull == null) {
                System.out.println("Message ID " + messageIdStr + " not found.");
                return new byte[0];
            }

            // 2. Retornar los bytes
            return audioFull.getData();

        } catch (NumberFormatException e) {
            System.err.println("Invalid message ID format: " + messageIdStr);
            return new byte[0];
        }
    }

    // ====================== LLAMADAS (SEÑALIZACIÓN ICE) ======================

    public CallInfo handleStartCall(String fromUser, String toReceiver, String serverIP) {
        if (usersDao.findById(fromUser) == null) return null;

        String sessionId = UUID.randomUUID().toString();

        try {
            CallSession session = new CallSession(sessionId, fromUser, toReceiver);
            activeCallSessions.put(sessionId, session);

            CallInfo info = new CallInfo();
            info.sessionId = sessionId;
            info.webSocketUrl = "ws://" + serverIP + ":3001/call_media/" + sessionId;

            callbackManager.notifyIncomingCall(fromUser, toReceiver, sessionId);

            return info;

        } catch (Exception e) {
            System.err.println("Error al iniciar la sesión (Flujo WS): " + e.getMessage());
            return null;
        }
    }

    public CallInfo handleJoinCall(String userId, String sessionId, String serverIP) {
        CallSession session = activeCallSessions.get(sessionId);
        if (session == null) return null;

        CallInfo info = new CallInfo();
        info.sessionId = sessionId;
        info.webSocketUrl = "ws://" + serverIP + ":3001/call_media/" + sessionId;

        System.out.println("User " + userId + " joined call " + sessionId);
        return info;
    }

    public boolean handleEndCall(String sessionId) {
        CallSession session = activeCallSessions.remove(sessionId);
        if (session != null) {
            callbackManager.notifyCallEnded(sessionId);
            return true;
        }
        return false;
    }
}
