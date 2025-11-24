package services;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import audio.MediaFlowHandler;
import daos.GroupDao;
import daos.UserDao;
import model.Pair;

public class CallService {
    private final Map<String, MediaFlowHandler> activeHandlers; // CallID -> Handler
    private final Map<String, Pair<String, String>> callParticipants; // CallID -> Pair<Sender, Receiver>
    
    private final UserDao usersDao;
    private final GroupDao groupDao;
    
    private static final int STARTING_UDP_PORT = 12001; // Puerto inicial libre después del puerto Ice
    private int nextAvailablePort;


    public CallService(UserDao usersDao, GroupDao groupDao) {
        this.activeHandlers = new HashMap<>();
        this.callParticipants = new HashMap<>();
        this.usersDao = usersDao;
        this.groupDao = groupDao;
        this.nextAvailablePort = STARTING_UDP_PORT;
    }

    /**
     * Inicializa una llamada, asigna un puerto UDP y comienza a escuchar.
     * @param fromUser El usuario que inicia la llamada.
     * @param toReceiver El usuario o grupo receptor.
     * @return Pair<String, Integer> con el CallID y el puerto UDP asignado.
     */
    public synchronized Pair<String, Integer> startCall(String fromUser, String toReceiver) {
        if (usersDao.finById(fromUser) == null) {
            System.err.println("User " + fromUser + " not found.");
            return null;
        }

        String callID = UUID.randomUUID().toString();
        
        int port = getNextUdpPort();
        try {
            // Pasamos los DAOs y la información de la llamada al manejador de flujo
            MediaFlowHandler handler = new MediaFlowHandler(port, callID, fromUser, toReceiver, usersDao, groupDao);
            handler.start(); 

            activeHandlers.put(callID, handler);
            callParticipants.put(callID, new Pair<>(fromUser, toReceiver));
            
            System.out.println("Call initiated: " + callID + " on UDP port " + port);
            
            return new Pair<>(callID, port);
            
        } catch (IOException e) {
            System.err.println("Error starting MediaFlowHandler on port " + port + ": " + e.getMessage());
            return null;
        }
    }

    /**
     * Finaliza la llamada y libera el recurso UDP.
     * @param callID El identificador de la llamada a finalizar.
     * @return true si la llamada fue finalizada, false si no se encontró.
     */
    public synchronized boolean endCall(String callID) {
        MediaFlowHandler handler = activeHandlers.remove(callID);
        if (handler != null) {
            handler.stopListening();
            callParticipants.remove(callID);
            System.out.println("Call ended: " + callID + ". UDP port released.");
            return true;
        }
        return false;
    }

    /**
     * Método auxiliar para asignar un puerto UDP disponible.
     */
    private int getNextUdpPort() {
        return nextAvailablePort++;
    }
}
