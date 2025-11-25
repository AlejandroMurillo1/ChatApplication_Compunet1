package daos;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.google.gson.reflect.TypeToken;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.Type;

import model.User;
import persistence.JsonFileUtils;

public class UserDao implements IDao<String, User> {

    private Map<String, User> users;

    private final String filePath = "data/users.json";

    public UserDao() {
        ensureFileExists();
        loadFromFile();
    }

    private void ensureFileExists() {
        File dataFolder = new File("data");
        if (!dataFolder.exists()) dataFolder.mkdirs();

        File file = new File(filePath);
        try {
            if (!file.exists()) file.createNewFile();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private void loadFromFile() {
        Type listType = new TypeToken<List<User>>() {}.getType();
        List<User> list = JsonFileUtils.readListFromFile(filePath, listType);
        users = new HashMap<>();
        if (list != null) {
            for (User u : list) {
                users.put(u.getName(), u);
            }
        }
    }

    private void saveToFile() {
        try {
            JsonFileUtils.writeListToFile(filePath, users.values().stream().toList());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public List<String> findAllKeys() {
        List<String> lista = new ArrayList<>();

        for (Map.Entry<String, User> entry : users.entrySet()) {
            User user = entry.getValue();
            if (user.isOnline()) {
                lista.add(entry.getKey());
            }
        }

        return lista;
    }

    @Override
    public List<User> findAllValues() {
        List<User> lista = new ArrayList<>();

        for (Map.Entry<String, User> entry : users.entrySet()) {
            User user = entry.getValue();
            if (user.isOnline()) {
                lista.add(user);
            }
        }

        return lista;
    }

    @Override
    public User findById(String name) {
        return users.get(name);
    }

    @Override
    public User update(User newEntity) {
        String name = newEntity.getName();
        users.get(name).setOnline(newEntity.isOnline());
        saveToFile();
        
        return users.get(name);
    }

    @Override
    public boolean delete(User entity) {
        String name = entity.getName();
        users.remove(name);
        return users.containsKey(name);
    }

    @Override
    public User save(User entity) {
        String name = entity.getName();
        users.put(name, entity);
        saveToFile();
        return users.get(name);
    }
}
