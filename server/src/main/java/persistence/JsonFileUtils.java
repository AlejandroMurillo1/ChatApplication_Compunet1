package persistence;

import com.google.gson.*;
import com.google.gson.ExclusionStrategy;
import com.google.gson.FieldAttributes;

import model.IMessage;
import model.Text;
import model.Audio;

import java.io.*;
import java.lang.reflect.Type;
import java.util.List;

public class JsonFileUtils {

    // Gson normal
    private static final Gson gson;

    // Gson para AUDIOS completos (guarda todo)
    private static final Gson gsonAudios;

    static {
        // Adaptador polimórfico para IMessage
        RuntimeTypeAdapterFactory<IMessage> messageAdapter =
                RuntimeTypeAdapterFactory
                        .of(IMessage.class, "type")
                        .registerSubtype(Text.class, "text")
                        .registerSubtype(Audio.class, "audio");

        // Estrategia: NO serializar el campo de bytes del Audio en los JSON de MENSAJES
        ExclusionStrategy audioBytesExclusion = new ExclusionStrategy() {
            @Override
            public boolean shouldSkipField(FieldAttributes f) {
                return f.getDeclaringClass() == Audio.class
                        && f.getName().equals("data");
            }

            @Override
            public boolean shouldSkipClass(Class<?> clazz) {
                return false;
            }
        };

        gson = new GsonBuilder()
                .registerTypeAdapterFactory(messageAdapter)
                .addSerializationExclusionStrategy(audioBytesExclusion)
                .setPrettyPrinting()
                .create();

        // Para AUDIOS completos no necesitamos adaptadores especiales
        gsonAudios = new GsonBuilder()
                .setPrettyPrinting()
                .create();
    }

    // ================== MÉTODOS NORMALES ==================

    public static <T> List<T> readListFromFile(String path, Type type) {
        try (Reader reader = new FileReader(path)) {
            List<T> list = gson.fromJson(reader, type);
            return (list == null) ? List.of() : list;
        } catch (IOException e) {
            System.out.println("No se encontró el archivo " + path + ", creando uno nuevo.");
            return List.of();
        }
    }

    public static <T> void writeListToFile(String path, List<T> list) {
        try (Writer writer = new FileWriter(path)) {
            gson.toJson(list, writer);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    // ================== MÉTODOS PARA AUDIOS COMPLETOS ==================

    public static <T> List<T> readAudioListFromFile(String path, Type type) {
        try (Reader reader = new FileReader(path)) {
            List<T> list = gsonAudios.fromJson(reader, type);
            return (list == null) ? List.of() : list;
        } catch (IOException e) {
            System.out.println("No se encontró el archivo de audios " + path + ", creando uno nuevo.");
            return List.of();
        }
    }

    public static <T> void writeAudioListToFile(String path, List<T> list) {
        try (Writer writer = new FileWriter(path)) {
            gsonAudios.toJson(list, writer);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
