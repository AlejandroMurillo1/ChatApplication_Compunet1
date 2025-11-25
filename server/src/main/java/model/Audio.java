package model;

public class Audio implements IMessage{
    private int id;
    private String sender;
    private String receiver;
    private byte[] data;

    public Audio(String sender, String receiver, byte[] data) {
        this.sender = sender;
        this.receiver = receiver;
        this.data = data;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    @Override
    public String getSender() {
        return sender;
    }

    @Override
    public String getReceiver() {
        return receiver;
    }

    @Override
    public byte[] getData() {
        return data;
    }

    public void setData(byte[] data) {
        this.data = data;
    }

    @Override
    public String getText() {
        return null;
    }

    @Override
    public boolean isAudio() {
        return true;
    }
}
