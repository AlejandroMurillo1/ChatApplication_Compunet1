import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.List;
import java.util.Map;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import com.zeroc.Ice.Communicator;
import com.zeroc.Ice.ObjectAdapter;
import com.zeroc.Ice.Util;

import dtos.Request;
import dtos.Response;
import model.*;
import services.ServerServices;
import services.CallService; 
import ice.VoiceChatI;
import daos.UserDao;
import daos.GroupDao;

public class Server {

    private Gson gson;
    private ServerServices services;
    private CallService callService;
    private boolean running;

    private Communicator communicator; 
    private static final String ICE_ADAPTER_NAME = "VoiceChatAdapter"; 
    private static final String ICE_ENDPOINT = "tcp -h 127.0.0.1 -p 12000"; 
    private static final String SERVER_IP = "127.0.0.1"; // IP que se enviará al cliente para UDP

    public static void main(String[] args) throws Exception {
        new Server();
    }

    public Server() throws Exception {
        gson = new Gson();
        services = new ServerServices(); 
        
        // Inicializar CallService usando los DAOs existentes
        UserDao usersDao = services.getUsersDao(); 
        GroupDao groupDao = services.getGroupDao(); 
        callService = new CallService(usersDao, groupDao); 
        
        // 1. Iniciar Servidor Ice en un hilo separado
        startIceServer(); 

        // 2. Continuar con el servidor de mensajería TCP existente
        int port = 5000;
        ServerSocket socket = new ServerSocket(port);
        System.out.println("Server running on port: " + port);
        running = true;
        
        // Usar un hilo para manejar conexiones TCP sin bloquear el hilo principal
        while (running) {
            Socket sc = socket.accept();
            // Esto permite que el servidor maneje múltiples conexiones TCP secuencialmente
            // El Proxy de Express.js asegura que estas peticiones sean cortas y rápidas.
            new Thread(() -> handleClient(sc)).start();
        }
        socket.close();
        
        if (communicator != null) {
            communicator.destroy();
        }
    }

    private void startIceServer() {
        Thread iceThread = new Thread(() -> {
            try {
                communicator = Util.initialize();
                ObjectAdapter adapter = communicator.createObjectAdapterWithEndpoints(
                    ICE_ADAPTER_NAME, ICE_ENDPOINT
                );
                
                VoiceChatI voiceChatServant = new VoiceChatI(callService, SERVER_IP); 
                
                adapter.add(voiceChatServant, Util.stringToIdentity("VoiceChat"));
                
                adapter.activate();
                System.out.println("ZeroC Ice Server running on endpoint: " + ICE_ENDPOINT);

                communicator.waitForShutdown(); 
            } catch (Exception e) {
                System.err.println("Error initializing ZeroC Ice Server: " + e.getMessage());
                e.printStackTrace();
            }
        });
        
        iceThread.start();
    }

    public void handleClient(Socket socket){
        try{
            System.out.println("New client connected from port " + socket.getPort());
            
            BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
            String msg = in.readLine();

            System.out.println("Message received:" + msg);

            Request rq = gson.fromJson(msg, Request.class);

            try {
                Response res = handleRequest(rq);

                System.out.println("Response: " + gson.toJson(res));

                out.println(gson.toJson(res));
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        } catch (IOException e) {
            System.out.println("IO Error");
            throw new RuntimeException(e);
        } finally {
            try {
                System.out.println("Connection closed");
                socket.close();
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }
    }

    public Response handleRequest(Request rq)throws Exception {
        Response resp = new Response();
        switch (rq.getAction()) {
            case "register_user":
                try {
                    String name = rq.getData().get("name").getAsString();
                    boolean online = rq.getData().get("online").getAsBoolean();

                    User newUser = services.registerUser(name, online);
                    System.out.println(newUser);

                    if(newUser != null){
                        resp.setstatus("ok");
                        resp.setData(gson.toJsonTree(newUser).getAsJsonObject());
                    }
                } catch (Exception e) {
                    resp.setstatus("error");
                    resp.setData(gson.toJsonTree(Map.of("message", "User registration failed")).getAsJsonObject());
                    return resp;
                }
                break;

            case "get_online_users":
                try {
                    List<String> namesOnlineUsers = services.getOnlineUsers();
                    System.out.println(namesOnlineUsers.toString());

                    if(namesOnlineUsers.size() > 1){
                        resp.setstatus("ok");
                        resp.setData(
                            gson.toJsonTree(Map.of("users", namesOnlineUsers)).getAsJsonObject()
                        );
                    } else {
                        resp.setstatus("warning");
                        resp.setData(gson.toJsonTree(Map.of("message", "Only one user registered")).getAsJsonObject());
                    }
                } catch (Exception e) {
                    resp.setstatus("error");
                    resp.setData(gson.toJsonTree(Map.of("message", "Get users online failed")).getAsJsonObject());
                    return resp;
                }
                break;

            case "get_user_groups":
                try {
                    String username = rq.getData().get("username").getAsString();
                    List<Group> userGroups = services.getUserGroups(username);
                    System.out.println("Groups of " + username + ": " +
                            gson.toJsonTree(Map.of("userGroups", userGroups)).getAsJsonObject());

                    if(userGroups.size() >= 1){
                        resp.setstatus("ok");
                        resp.setData(
                            gson.toJsonTree(Map.of("userGroups", userGroups)).getAsJsonObject()
                        );
                    } else {
                        resp.setstatus("warning");
                        resp.setData(gson.toJsonTree(Map.of("message", username + " is not a member of any group")).getAsJsonObject());
                    }
                } catch (Exception e) {
                    resp.setstatus("error");
                    resp.setData(gson.toJsonTree(Map.of("message", "Get groups failed")).getAsJsonObject());
                    return resp;
                }
                break;
            
            case "create_group":
                try {
                    String groupName = rq.getData().get("name").getAsString();
                    List<String> members = gson.fromJson(
                        rq.getData().get("members"),
                        new TypeToken<List<String>>() {}.getType()
                    );
                    
                    Group newGroup = services.createGroup(groupName, members);
                    System.out.println(newGroup.toString());

                    if(newGroup != null){
                        resp.setstatus("ok");
                        resp.setData(gson.toJsonTree(newGroup).getAsJsonObject());
                    }
                } catch (Exception e) {
                    resp.setstatus("error");
                    resp.setData(gson.toJsonTree(Map.of("message", "Group registration failed")).getAsJsonObject());
                    return resp;
                }
                break;
            
            case "add_message":
                try {
                    String sender = rq.getData().get("sender").getAsString();
                    String receiver = rq.getData().get("receiver").getAsString();
                    String content = rq.getData().get("message").getAsString();

                    Message newMsg = services.addMessage(sender, receiver, content);
                    System.out.println(newMsg);

                    if(newMsg != null){
                        resp.setstatus("ok");
                        resp.setData(gson.toJsonTree(newMsg).getAsJsonObject());
                    }
                } catch (Exception e) {
                    resp.setstatus("error");
                    resp.setData(gson.toJsonTree(Map.of("message", "Message registration failed")).getAsJsonObject());
                    return resp;
                }
                break;
            
            case "get_messages":
                try {
                    System.out.println("All messages keys: " +
                            gson.toJsonTree(Map.of("keys", services.getAllMsgKeys())).getAsJsonObject());

                    System.out.println("All messages: " +
                            gson.toJsonTree(Map.of("messages", services.getAllMsgValues())).getAsJsonObject());

                    String sender = rq.getData().get("sender").getAsString();
                    String receiver = rq.getData().get("receiver").getAsString();

                    boolean isGroup = services.isGroup(receiver);

                    List<Message> messages = services.getChatMessages(sender, receiver, isGroup);

                    System.out.println("Messages of " + sender + " and " + receiver + ": " +
                            gson.toJsonTree(Map.of("messages", messages)).getAsJsonObject());

                    if(messages.size() >= 1){
                        resp.setstatus("ok");
                        resp.setData(
                            gson.toJsonTree(Map.of("messages", messages)).getAsJsonObject()
                        );
                    } else {
                        resp.setstatus("warning");
                        resp.setData(gson.toJsonTree(Map.of("message", sender + " and " + receiver +
                         " haven't messages yet")).getAsJsonObject());
                    }
                } catch (Exception e) {
                    resp.setstatus("error");
                    resp.setData(gson.toJsonTree(Map.of("message", "Get messages failed")).getAsJsonObject());
                    return resp;
                }
                break;
            
            case "logout_user":
                try {
                    String name = rq.getData().get("name").getAsString();
                    boolean online = rq.getData().get("online").getAsBoolean();

                    User newUser = services.updateUser(name, online);
                    System.out.println(newUser);

                    if(newUser != null){
                        resp.setstatus("ok");
                        resp.setData(gson.toJsonTree(newUser).getAsJsonObject());
                    }
                } catch (Exception e) {
                    resp.setstatus("error");
                    resp.setData(gson.toJsonTree(Map.of("message", "User update failed")).getAsJsonObject());
                    return resp;
                }
                break;

            default:
                resp.setstatus("error");
                resp.setData(gson.toJsonTree(Map.of("message", "Unknown action")).getAsJsonObject());
                break;
        }
        
        return resp;
    }

}
