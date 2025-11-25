package model;

public class Text implements IMessage {
    private String sender;
    private String receiver;
    private String text;
    
    public Text(String sender, String receiver, String text) {
        this.sender = sender;
        this.receiver = receiver;
        this.text = text;
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
    public String getText() {
        return text;
    }

    @Override
    public byte[] getData() {
        return null;
    }

    @Override
    public boolean isAudio() {
        return false;
    }
}
