package audio;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.util.HashSet;
import java.util.Set;

import daos.GroupDao;
import daos.UserDao;

public class MediaFlowHandler extends Thread {

    private final int port;
    private final String callID;
    private final String sender; // Quien inició la llamada
    private final String receiver; // Usuario o Grupo
    
    private volatile boolean keepListening;
    private DatagramSocket socket;

    // Mapa para rastrear las IPs y Puertos de los clientes que han enviado tráfico UDP.
    // Clave: Dirección (IP:Puerto)
    private final Set<String> activeClients; 
    
    private final UserDao usersDao;
    private final GroupDao groupDao;

    public MediaFlowHandler(int port, String callID, String sender, String receiver, UserDao usersDao, GroupDao groupDao) throws IOException {
        this.port = port;
        this.callID = callID;
        this.sender = sender;
        this.receiver = receiver;
        this.keepListening = true;
        this.socket = new DatagramSocket(port);
        this.activeClients = new HashSet<>(); 
        this.usersDao = usersDao;
        this.groupDao = groupDao;
        System.out.println("MediaFlowHandler for Call " + callID + " started on port " + port);
    }
    
    public void stopListening() {
        this.keepListening = false;
        if (socket != null && !socket.isClosed()) {
            socket.close();
        }
    }

    @Override
    public void run() {
        byte[] buffer = new byte[AudioConfig.UDP_PACKET_SIZE];
        
        while (keepListening) {
            try {
                DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                socket.receive(packet);
                
                InetAddress senderAddress = packet.getAddress();
                int senderPort = packet.getPort();
                String senderKey = senderAddress.getHostAddress() + ":" + senderPort;

                // 1. Registrar el cliente si es la primera vez que envía un paquete
                if (activeClients.add(senderKey)) {
                    System.out.println("Call " + callID + ": New client registered via UDP: " + senderKey);
                }
                
                // 2. Determinar los destinos de retransmisión (Fanout)
                // En un sistema real, se usaría la lista de participantes de CallService
                // y se verificaría qué IPs/Puertos están conectados.
                
                // 3. Retransmitir a todos los clientes activos (excepto al remitente)
                for (String clientKey : activeClients) {
                    if (!clientKey.equals(senderKey)) {
                        String[] parts = clientKey.split(":");
                        InetAddress destAddress = InetAddress.getByName(parts[0]);
                        int destPort = Integer.parseInt(parts[1]);
                        
                        // Crear y enviar un nuevo DatagramPacket al destino
                        DatagramPacket responsePacket = new DatagramPacket(
                            packet.getData(), 
                            packet.getLength(), 
                            destAddress, 
                            destPort
                        );
                        socket.send(responsePacket);
                    }
                }
                
            } catch (IOException e) {
                if (keepListening) {
                    System.err.println("MediaFlowHandler UDP Read Error for Call " + callID + ": " + e.getMessage());
                }
                // Si el socket se cerró (stopListening), es una excepción esperada.
            }
        }
    }
}
