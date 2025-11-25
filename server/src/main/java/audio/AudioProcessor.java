package audio;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.util.UUID;
import javax.sound.sampled.*;

// Clase con responsabilidad única para el manejo y conversión de buffers de audio (usando Javax.sound)
public class AudioProcessor {

    private final AudioFormat audioFormat;
    private final String AUDIO_STORAGE_PATH = "data/";

    public AudioProcessor() {
        this.audioFormat = AudioConfig.getAudioFormat();
        ensureStoragePathExists();
    }

    private void ensureStoragePathExists() {
        File dataFolder = new File(AUDIO_STORAGE_PATH);

        if (!dataFolder.exists()) {
            boolean created = dataFolder.mkdirs();

            if (created) {
                System.out.println("Ruta de almacenamiento de audio creada: " + AUDIO_STORAGE_PATH);
            } else {
                System.err.println("CRÍTICO: No se pudo crear la ruta de almacenamiento de audio: " + AUDIO_STORAGE_PATH);
            }
        }
    }

    public String saveAudioBufferAsWav(byte[] audioData) throws IOException {
        String fileName = UUID.randomUUID().toString() + ".wav";
        File fileOut = new File(AUDIO_STORAGE_PATH + fileName);

        try (ByteArrayInputStream bais = new ByteArrayInputStream(audioData);
             AudioInputStream ais = new AudioInputStream(bais, audioFormat, audioData.length / audioFormat.getFrameSize())) {

            AudioSystem.write(ais, AudioFileFormat.Type.WAVE, fileOut);

            return fileName;
        } catch (IOException e) {
            System.err.println("Error saving audio file: " + e.getMessage());
            throw e;
        }
    }
}
