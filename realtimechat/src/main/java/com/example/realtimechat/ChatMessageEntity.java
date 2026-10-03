
package com.example.realtimechat;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class ChatMessageEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String sender;
    private String receiver;
    private String content;
    private String room;
    private String status;

    public ChatMessageEntity() {
    }

    // Group chat constructor
    public ChatMessageEntity(String sender, String content, String room) {
        this.sender = sender;
        this.content = content;
        this.room = room;
        this.receiver = null;
        this.status = "SENT";
    }

    // Private chat constructor
    public ChatMessageEntity(
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