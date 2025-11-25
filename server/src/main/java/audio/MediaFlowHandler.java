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
    private final String callID;
    private volatile boolean keepListening;
    private final DatagramSocket socket;

    // Set para rastrear las IPs y Puertos de los clientes que están enviando tráfico UDP
    private final Set<String> activeClients;

    public MediaFlowHandler(int port, String callID, String sender, String receiver, UserDao usersDao, GroupDao groupDao) throws IOException {
        this.callID = callID;
        // Usuario o Grupo
        this.keepListening = true;
        this.socket = new DatagramSocket(port);
        this.activeClients = new HashSet<>();
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

                // 1. Registrar el cliente que está enviando el audio
                if (activeClients.add(senderKey)) {
                    System.out.println("Call " + callID + ": New client registered via UDP: " + senderKey);
                }

                // 2. Retransmitir a todos los clientes activos (excepto al remitente)
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
            }
        }
    }
}
