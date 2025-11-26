package services;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

// Importar clases generadas por Slice (ClientCallbackPrx, UdpConnectionInfo, etc.)
import Chat.CallInfo;
import Chat.ClientCallbackPrx;

import audio.AudioProcessor;

import daos.GroupDao;
import daos.UserDao;
import daos.MessageDao;
import model.Audio;

public class CallService {

    // Mapas concurrentes para manejar múltiples hilos de Ice sin errores
    private final Map<String, ClientCallbackPrx> activeCallbacks = new ConcurrentHashMap<>();
    private final UserDao usersDao;
    private final GroupDao groupDao;
    private final MessageDao messageDao;
    private final AudioProcessor audioProcessor;

    public CallService(UserDao usersDao, GroupDao groupDao, MessageDao messageDao) {
        this.usersDao = usersDao;
        this.groupDao = groupDao;
        this.messageDao = messageDao;
        this.audioProcessor = new AudioProcessor();
    }

    // ========================= MÉTODOS ICE (VOICECHAT) =========================

    public void registerCallback(String clientID, ClientCallbackPrx callback) {
        activeCallbacks.put(clientID, callback);
        System.out.println("Ice: Callback registrado para el usuario: " + clientID);
    }

    public CallInfo requestCall(String fromUser, String toReceiver) {
        // 1. Validar si el usuario existe
        if (!usersDao.findAllKeys().contains(toReceiver)) {
            return new CallInfo("", "NOT_FOUND");
        }

        // 2. Validar si el receptor tiene conexión activa con el Proxy (tiene callback)
        if (!activeCallbacks.containsKey(toReceiver)) {
            return new CallInfo("", "OFFLINE");
        }

        // 3. Generar ID único para la llamada
        String callID = UUID.randomUUID().toString();

        // 4. Notificar al receptor (El Proxy recibirá esto y enviará un evento WebSocket al cliente)
        // Ejecutamos en un hilo aparte para no bloquear el retorno inmediato
        new Thread(() -> notifyIncomingCall(fromUser, toReceiver, callID)).start();

        System.out.println("Llamada iniciada: " + callID + " de " + fromUser + " para " + toReceiver);

        // 5. Retornar info de éxito (Java NO devuelve IP ni puerto)
        return new CallInfo(callID, "OK");
    }

    public void endCall(String callID) {
        // Aquí podrías notificar a las partes si fuera necesario,
        // pero usualmente el Proxy maneja la desconexión del socket.
        System.out.println("Ice: Llamada finalizada reportada: " + callID);

        // Si necesitas notificar explícitamente a los clientes vía Ice:
        // notifyCallEnded(callID);
    }

    // PERSISTENCIA DE MENSAJES DE VOZ
    public void saveVoiceMessage(String fromUser, String toReceiver, byte[] audioData) {
        try {
            // 1. Guardar el archivo .wav en disco
            String fileName = audioProcessor.saveAudioBufferAsWav(audioData);

            // 2. Crear metadatos (IMPORTANTE: Pasamos null en 'data' para no guardar bytes en memoria RAM)
            Audio audioMetadata = new Audio(fromUser, toReceiver, null);

            // Usamos el hash del nombre del archivo como ID temporal (ya que tu modelo usa int)
            // Idealmente deberías cambiar el ID a String en el futuro.
            audioMetadata.setId(Math.abs(fileName.hashCode()));

            // Guardamos el nombre del archivo en el texto o en un campo auxiliar si tu modelo lo permite.
            // Por ahora, asumiremos que el cliente puede pedir el audio por su ID.

            // 3. Persistir solo los metadatos en el JSON
            if (isGroup(toReceiver)) {
                messageDao.saveGroupMessage(audioMetadata);
            } else {
                messageDao.saveUserMessage(audioMetadata);
            }

            // 4. Notificar al receptor que tiene un nuevo audio
            new Thread(() -> notifyVoiceMessageReceived(fromUser, toReceiver, fileName)).start();

        } catch (IOException e) {
            System.err.println("Error crítico guardando audio: " + e.getMessage());
        }
    }

    private boolean isGroup(String name) {
        return groupDao.findById(name) != null;
    }

    // ========================= NOTIFICACIONES (CALLBACKS) =========================

    private void notifyIncomingCall(String fromUser, String toReceiver, String callID) {
        ClientCallbackPrx callback = activeCallbacks.get(toReceiver);
        if (callback != null) {
            try {
                callback.incomingCall(fromUser, callID);
            } catch (Exception e) {
                System.err.println("Error notificando llamada a " + toReceiver + ". Eliminando callback.");
                activeCallbacks.remove(toReceiver);
            }
        }
    }

    private void notifyVoiceMessageReceived(String sender, String receiver, String fileName) {
        // Si es un grupo, habría que notificar a todos los miembros (bucle).
        // Si es usuario directo:
        ClientCallbackPrx callback = activeCallbacks.get(receiver);
        if (callback != null) {
            try {
                // El parámetro del medio es 'groupOrUser'. Si es directo, es null o el mismo receiver.
                callback.voiceMessageReceived(sender, receiver, fileName);
            } catch (Exception e) {
                System.err.println("Error notificando audio a " + receiver);
            }
        }
    }
}