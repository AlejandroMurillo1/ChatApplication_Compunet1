package daos;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.google.gson.reflect.TypeToken;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.Type;

import model.Group;
import persistence.JsonFileUtils;

public class GroupDao implements IDao<String,Group> {

    private Map<String, Group> groups;

    private final String filePath = "data/groups.json";

    public GroupDao() {
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
        Type listType = new TypeToken<List<Group>>() {}.getType();
        List<Group> list = JsonFileUtils.readListFromFile(filePath, listType);
        groups = new HashMap<>();
        if (list != null) {
            for (Group g : list) {
                groups.put(g.getName(), g);
            }
        }
    }

    private void saveToFile() {
        try {
            JsonFileUtils.writeListToFile(filePath, groups.values().stream().toList());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public List<String> findAllKeys() {
        List<String> lista = new ArrayList<>();

        for (Map.Entry<String, Group> entry : groups.entrySet()) {
            lista.add(entry.getKey());
        }

        return lista;
    }

    @Override
    public List<Group> findAllValues() {
        List<Group> lista = new ArrayList<>();

        for (Map.Entry<String, Group> entry : groups.entrySet()) {
            lista.add(entry.getValue());
        }

        return lista;
    }

    @Override
    public Group findById(String name) {
        return groups.get(name);
    }

    @Override
    public Group update(Group newEntity) {
        String name = newEntity.getName();
        groups.get(name).setMembers(newEntity.getMembers());

        return groups.get(name);
    }

    @Override
    public boolean delete(Group entity) {
        String name = entity.getName();
        groups.remove(name);
        return groups.containsKey(name);
    }

    @Override
    public Group save(Group entity) {
        String name = entity.getName();
        groups.put(name, entity);
        saveToFile();
        return groups.get(name);
    }
    
}
