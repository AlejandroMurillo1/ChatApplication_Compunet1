package services;

import java.util.ArrayList;
import java.util.List;

import daos.*;
import model.*;

public class ServerServices {

    private IDao<String, User> usersDao;
    private IDao<String, Group>  groupDao;
    private MessageDao messageDao;
    
    public ServerServices() {
        this.usersDao = new UserDao();
        this.groupDao = new GroupDao();
        this.messageDao = new MessageDao();
    }

    synchronized public User registerUser(String name, boolean online) {
        User newUser = new User(name, online);

        if(usersDao.findAllKeys().contains(newUser.getName())){
            usersDao.update(newUser);
            System.out.println("The user " + newUser.getName() + " is already registered. Online status updated: online = " + newUser.isOnline());
        } else {
            usersDao.save(newUser);
            System.out.println("The new user " + newUser.getName() + " was registered");
        }

        return usersDao.finById(newUser.getName());
    }

    public User updateUser(String name, boolean online) {
        User newUser = new User(name, online);
        usersDao.update(newUser);
        System.out.println("The user " + newUser.getName() + " has been updated. Online status: online = " + newUser.isOnline());

        return usersDao.finById(newUser.getName());
    }

    synchronized public List<String> getOnlineUsers() {
        System.out.println("Getting online users registered...");
        return usersDao.findAllKeys();
    }

    synchronized public List<Group> getAllGroups() {
        System.out.println("Getting all groups registered...");
        return groupDao.findAllValues();
    }

    synchronized public List<Group> getUserGroups(String username) {
        List<Group> allGroups = groupDao.findAllValues();

        System.out.println("Groups registered: " + allGroups.toString());

        List<Group> userGroups = new ArrayList<>();

        for (Group group : allGroups) {
            for (String member : group.getMembers()) {
                if (member.equals(username)) {
                    userGroups.add(group);
                    break;
                }
            }
        }

        return userGroups;
    }

    synchronized public Group createGroup(String groupName, List<String> members) {
        Group newGroup = new Group(groupName, members);

        Group created = groupDao.save(newGroup);

        System.out.println("The group " + created.getName() + " has been created with members: " + created.getMembers().toString());

        return groupDao.finById(groupName);
    }

    synchronized public Message addMessage(String sender, String receiver, String msg) {
        Message newMessage = new Message(sender, receiver, msg);

        if(!isGroup(receiver)) {
            messageDao.saveUserMessage(newMessage);
        } else {
            messageDao.saveGroupMessage(newMessage);
        }
        
        return newMessage;
    }

    synchronized public List<Message> getChatMessages(String sender, String receiver, boolean isGroup) {
        if (!isGroup) {
            return messageDao.finById(new Pair<>(sender, receiver));
        } else {
            //Obtener todos los mensajes en los que el receiver sea un grupo
            return messageDao.findByGroup(receiver);
        }
    }

    public boolean isGroup(String name) {
        return groupDao.finById(name) != null;
    }

    public List<List<Message>> getAllMsgValues() {
        return messageDao.findAllValues();
    }

    public List<Pair<String, String>> getAllMsgKeys() {
        return messageDao.findAllKeys();
    }

    public GroupDao getGroupDao() {
        return (GroupDao) groupDao;
    }

    public UserDao getUsersDao() {
        return (UserDao) usersDao;
    }

}
