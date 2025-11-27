package audio.ice;

import ChatAudio.AudioClientCallbackPrx;

import java.util.HashMap;
import java.util.Map;

public class AudioClientManager {
    private final Map<String, AudioClientCallbackPrx> activeCallbacks;

    public AudioClientManager() {
        this.activeCallbacks = new HashMap<>();
    }

    public synchronized void registerCallback(String clientID, AudioClientCallbackPrx callback) {
        activeCallbacks.put(clientID, callback);
    }

    public synchronized void unregisterCallback(String clientID) {
        activeCallbacks.remove(clientID);
    }

    // ================== MÉTODOS DE NOTIFICACIÓN ==================

    public void notifyIncomingCall(String fromUser, String toReceiver, String sessionId) {
        // Busca el proxy del receptor directo
        AudioClientCallbackPrx receiverCallback = activeCallbacks.get(toReceiver);

        if (receiverCallback != null) {
            try {
                receiverCallback.incomingCall(fromUser, sessionId);
                System.out.println("Callback: Call notification sent to " + toReceiver);
            } catch (com.zeroc.Ice.Exception e) {
                System.err.println("Callback failed for " + toReceiver + ". Proxy removed.");
                unregisterCallback(toReceiver);
            }
        } else {
            System.out.println("Warning: Receiver " + toReceiver + " not available for callback.");
        }
    }

    public void notifyCallEnded(String sessionId) {
        // En producción se buscarían solo los participantes. Aquí notificamos a todos para el ejemplo.
        for (AudioClientCallbackPrx callback : activeCallbacks.values()) {
            try {
                callback.callEnded(sessionId);
            } catch (com.zeroc.Ice.Exception e) {
                // Ignore failure if client is already gone
            }
        }
    }

    // NOTA: Asumiendo que has añadido 'voiceMessageReceived' a Audio.ice
    public void notifyVoiceMessageReceived(String sender, String receiver, String fileName) {
        AudioClientCallbackPrx receiverCallback = activeCallbacks.get(receiver);
        if (receiverCallback != null) {
            try {
                receiverCallback.voiceMessageReceived(sender, receiver, fileName);
            } catch (com.zeroc.Ice.Exception e) {
                unregisterCallback(receiver);
            }
        }
    }
}
