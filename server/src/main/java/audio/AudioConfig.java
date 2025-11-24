package audio;

import javax.sound.sampled.AudioFormat;

public class AudioConfig {
    // Formato de audio estándar para VoIP
    public static final float SAMPLE_RATE = 8000.0F; // 8kHz
    public static final int SAMPLE_SIZE_IN_BITS = 16;
    public static final int CHANNELS = 1; // Mono
    public static final boolean SIGNED = true;
    public static final boolean BIG_ENDIAN = false;

    public static AudioFormat getAudioFormat() {
        return new AudioFormat(SAMPLE_RATE, SAMPLE_SIZE_IN_BITS, CHANNELS, SIGNED, BIG_ENDIAN);
    }
    
    // Tamaño de búfer de UDP para audio (ej. 10ms de audio a 8kHz, 16-bit mono)
    // 8000 muestras/s * 2 bytes/muestra = 16000 bytes/s. 
    // 16000 bytes/s * 0.02s (20ms) = 320 bytes. Usamos un buffer de 1KB como margen.
    public static final int UDP_PACKET_SIZE = 1024; // 1 KB
}
