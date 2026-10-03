
package com.example.realtimechat;

public class ChatMessage {

    private Long id;
    private String sender;
    private String receiver;
    private String content;
    private String room;
    private String status;

    public ChatMessage() {
        this.status = "SENT";
    }

    // Group chat constructor
    public ChatMessage(String sender, String content, String room) {
        this.sender = sender;
        this.content = content;
        this.room = room;
        this.receiver = null;
        this.status = "SENT";
    }

    // Private chat constructor
    public ChatMessage(
            String sender,
            String receiver,
            String content,
            String room) {

        this.sender = sender;
        this.receiver = receiver;
        this.content = content;
        this.room = room;
        this.status = "SENT";
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSender() {
        return sender;
    }

    public void setSender(String sender) {
        this.sender = sender;
    }

    public String getReceiver() {
        return receiver;
    }

    public void setReceiver(String receiver) {
        this.receiver = receiver;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getRoom() {
        return room;
    }

    public void setRoom(String room) {
        this.room = room;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}