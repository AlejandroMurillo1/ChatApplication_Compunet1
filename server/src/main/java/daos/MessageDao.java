package daos;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.Type;
import java.util.*;

import com.google.gson.reflect.TypeToken;

import model.Audio;
import model.IMessage;
import model.Pair;
import persistence.JsonFileUtils;

public class MessageDao implements IDao<Pair<String, String>, List<IMessage>> {

    // Mensajes
    private Map<Pair<String, String>, List<IMessage>> userMessages;
    private Map<String, List<IMessage>> groupMessages;

    private final String userFilePath = "data/messages_users.json";
    private final String groupFilePath = "data/messages_groups.json";

    // Audios completos
    private Map<Pair<String, String>, Map<Integer, Audio>> userAudioStore;
    private Map<String, Map<Integer, Audio>> groupAudioStore;

    private final String userAudioFilePath = "data/audios_users.json";
    private final String groupAudioFilePath = "data/audios_groups.json";

    public MessageDao() {
        ensureFilesExist();
        loadFromFiles();
    }

    private void ensureFilesExist() {
        File dataFolder = new File("data");
        if (!dataFolder.exists()) dataFolder.mkdirs();

        try {
            new File(userFilePath).createNewFile();
            new File(groupFilePath).createNewFile();
            new File(userAudioFilePath).createNewFile();
            new File(groupAudioFilePath).createNewFile();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private void loadFromFiles() {
        try {
            // Cargar mensajes usuarios 1a1
            Type userListType = new TypeToken<List<IMessage>>() {}.getType();
            List<IMessage> userList = JsonFileUtils.readListFromFile(userFilePath, userListType);
            userMessages = new HashMap<>();

            if (userList != null) {
                for (IMessage m : userList) {
                    Pair<String, String> key = normalizeKey(m.getSender(), m.getReceiver());
                    userMessages.computeIfAbsent(key, k -> new ArrayList<>()).add(m);
                }
            }

            // Cargar mensajes grupos
            Type groupListType = new TypeToken<List<IMessage>>() {}.getType();
            List<IMessage> groupList = JsonFileUtils.readListFromFile(groupFilePath, groupListType);
            groupMessages = new HashMap<>();

            if (groupList != null) {
                for (IMessage m : groupList) {
                    groupMessages.computeIfAbsent(m.getReceiver(), k -> new ArrayList<>()).add(m);
                }
            }

            // Cargar audios completos usuarios 1a1
            Type audioListType = new TypeToken<List<Audio>>() {}.getType();
            List<Audio> userAudios = JsonFileUtils.readAudioListFromFile(userAudioFilePath, audioListType);
            userAudioStore = new HashMap<>();

            if (userAudios != null) {
                for (Audio a : userAudios) {
                    Pair<String, String> key = normalizeKey(a.getSender(), a.getReceiver());
                    Map<Integer, Audio> audiosById = userAudioStore.computeIfAbsent(key, k -> new HashMap<>());
                    audiosById.put(a.getId(), a);
                }
            }

            // Cargar audios completos grupos
            List<Audio> groupAudios = JsonFileUtils.readAudioListFromFile(groupAudioFilePath, audioListType);
            groupAudioStore = new HashMap<>();

            if (groupAudios != null) {
                for (Audio a : groupAudios) {
                    String groupName = a.getReceiver();
                    Map<Integer, Audio> audiosById = groupAudioStore.computeIfAbsent(groupName, k -> new HashMap<>());
                    audiosById.put(a.getId(), a);
                }
            }

            // Sincronizar datos de audio completos con los mensajes cargados en memoria (Sin almacenar bytes en los mensajes)
            syncAudioDataWithMessages();

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void syncAudioDataWithMessages() {

    }

    // Guardar mensajes

    private void saveUserMessages() {
        try {
            List<IMessage> all = userMessages.values().stream().flatMap(List::stream).toList();
            JsonFileUtils.writeListToFile(userFilePath, all);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void saveGroupMessages() {
        try {
            List<IMessage> all = groupMessages.values().stream().flatMap(List::stream).toList();
            JsonFileUtils.writeListToFile(groupFilePath, all);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // Guardar audios completos

    private void saveUserAudios() {
        try {
            List<Audio> all = userAudioStore.values().stream()
                    .flatMap(map -> map.values().stream())
                    .toList();
            JsonFileUtils.writeAudioListToFile(userAudioFilePath, all);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void saveGroupAudios() {
        try {
            List<Audio> all = groupAudioStore.values().stream()
                    .flatMap(map -> map.values().stream())
                    .toList();
            JsonFileUtils.writeAudioListToFile(groupAudioFilePath, all);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // ===============================================================
    // ============= MÉTODOS PARA MENSAJES ENTRE USUARIOS =============
    // ===============================================================

    @Override
    public List<IMessage> save(List<IMessage> entity) {
        if (entity == null || entity.isEmpty()) return null;

        IMessage first = entity.get(0);
        Pair<String, String> key = normalizeKey(first.getSender(), first.getReceiver());

        List<IMessage> existing = userMessages.getOrDefault(key, new ArrayList<>());

        for (IMessage m : entity) {
            if (m.isAudio() && m instanceof Audio audio) {
                saveUserAudioInternal(key, audio);
            }
            existing.add(m);
        }

        userMessages.put(key, existing);
        saveUserMessages();
        return existing;
    }

    public List<IMessage> saveUserMessage(IMessage message) {
        Pair<String, String> key = normalizeKey(message.getSender(), message.getReceiver());
        List<IMessage> existing = userMessages.getOrDefault(key, new ArrayList<>());

        // Si es audio: asignar id y guardarlo en el JSON de audios
        if (message.isAudio() && message instanceof Audio audio) {
            saveUserAudioInternal(key, audio);
        }

        existing.add(message);
        userMessages.put(key, existing);
        saveUserMessages();
        return existing;
    }

    private void saveUserAudioInternal(Pair<String, String> key, Audio audio) {
        Map<Integer, Audio> audiosById = userAudioStore.getOrDefault(key, new HashMap<>());

        // Asignar id secuencial
        int nextId = getNextAudioIdForMap(audiosById);
        audio.setId(nextId);
        audiosById.put(audio.getId(), audio);

        userAudioStore.put(key, audiosById);
        saveUserAudios();
    }

    @Override
    public List<IMessage> findById(Pair<String, String> id) {
        Pair<String, String> key = normalizeKey(id.getFirst(), id.getSecond());
        return userMessages.getOrDefault(key, new ArrayList<>());
    }

    // ===============================================================
    // =================== MÉTODOS PARA GRUPOS =======================
    // ===============================================================

    public List<IMessage> saveGroupMessage(IMessage message) {
        String groupName = message.getReceiver();
        List<IMessage> existing = groupMessages.getOrDefault(groupName, new ArrayList<>());

        // Si es audio: asignar id y guardarlo en el JSON de audios
        if (message.isAudio() && message instanceof Audio audio) {
            saveGroupAudioInternal(groupName, audio);
        }

        existing.add(message);
        groupMessages.put(groupName, existing);
        saveGroupMessages();
        return existing;
    }

    private void saveGroupAudioInternal(String groupName, Audio audio) {
        Map<Integer, Audio> audiosById = groupAudioStore.getOrDefault(groupName, new HashMap<>());

        int nextId = getNextAudioIdForMap(audiosById);
        audio.setId(nextId);
        audiosById.put(audio.getId(), audio);

        groupAudioStore.put(groupName, audiosById);
        saveGroupAudios();
    }

    public List<IMessage> findByGroup(String groupName) {
        return groupMessages.getOrDefault(groupName, new ArrayList<>());
    }

    // ===============================================================
    // ====================== MÉTODOS AUXILIARES =====================
    // ===============================================================

    private Pair<String, String> normalizeKey(String a, String b) {
        return (a.compareTo(b) < 0) ? new Pair<>(a, b) : new Pair<>(b, a);
    }

    private int getNextAudioIdForMap(Map<Integer, Audio> audiosById) {
        int max = 0;
        for (Integer id : audiosById.keySet()) {
            if (id > max) max = id;
        }
        return max + 1;
    }

    // ===============================================================

    @Override
    public List<Pair<String, String>> findAllKeys() {
        return new ArrayList<>(userMessages.keySet());
    }

    @Override
    public List<List<IMessage>> findAllValues() {
        return new ArrayList<>(userMessages.values());
    }

    @Override
    public List<IMessage> update(List<IMessage> newEntity) {
        if (newEntity == null || newEntity.isEmpty()) return null;
        IMessage first = newEntity.get(0);
        Pair<String, String> key = normalizeKey(first.getSender(), first.getReceiver());
        userMessages.put(key, newEntity);
        saveUserMessages();
        return newEntity;
    }

    @Override
    public boolean delete(List<IMessage> entity) {
        if (entity == null || entity.isEmpty()) return false;
        IMessage first = entity.get(0);
        Pair<String, String> key = normalizeKey(first.getSender(), first.getReceiver());
        boolean removed = userMessages.remove(key) != null;
        if (removed) saveUserMessages();
        return removed;
    }
}
