package model;

public interface IMessage {
    public String getSender();
    public String getReceiver();
    public String getText();
    public byte[] getData();
    public boolean isAudio();
}
