
package com.example.realtimechat;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

@RestController
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatMessageRepository chatMessageRepository;

    public ChatController(
            SimpMessagingTemplate messagingTemplate,
            ChatMessageRepository chatMessageRepository) {

        this.messagingTemplate = messagingTemplate;
        this.chatMessageRepository = chatMessageRepository;
    }

    // SEND MESSAGE
    @MessageMapping("/send")
    public void sendMessage(ChatMessage message) {

        if (message.getSender() == null
                || message.getSender().isBlank()
                || message.getContent() == null
                || message.getContent().isBlank()) {
            return;
        }

        String sender = message.getSender().trim();
        String content = message.getContent().trim();

        // PRIVATE MESSAGE
        if (message.getReceiver() != null
                && !message.getReceiver().isBlank()) {

            String receiver = message.getReceiver().trim();

            if (sender.equals(receiver)) {
                return;
            }

            ChatMessageEntity entity = new ChatMessageEntity(
                    sender,
                    receiver,
                    content,
                    "private"
            );

            entity.setStatus("SENT");
            ChatMessageEntity saved = chatMessageRepository.save(entity);

            ChatMessage response = toChatMessage(saved);

            messagingTemplate.convertAndSend(
                    "/topic/private/" + receiver,
                    response
            );

            messagingTemplate.convertAndSend(
                    "/topic/private/" + sender,
                    response
            );

            return;
        }

        // GROUP MESSAGE
        if (message.getRoom() == null
                || message.getRoom().isBlank()) {
            return;
        }

        String room = message.getRoom().trim();

        ChatMessageEntity entity = new ChatMessageEntity(
                sender,
                content,
                room
        );

        entity.setStatus("SENT");
        ChatMessageEntity saved = chatMessageRepository.save(entity);

        ChatMessage response = toChatMessage(saved);

        messagingTemplate.convertAndSend(
                "/topic/messages/" + room,
                response
        );
    }

    // UPDATE PRIVATE MESSAGE STATUS
    // Client sends to /app/status with message id and status
    @MessageMapping("/status")
    public void updateMessageStatus(ChatMessage update) {

        if (update.getId() == null
                || update.getStatus() == null) {
            return;
        }

        String newStatus = update.getStatus().trim().toUpperCase();

        if (!newStatus.equals("DELIVERED")
                && !newStatus.equals("READ")) {
            return;
        }

        ChatMessageEntity entity = chatMessageRepository
                .findById(update.getId())
                .orElse(null);

        if (entity == null
                || !"private".equals(entity.getRoom())) {
            return;
        }

        // Do not move status backwards
        if ("READ".equals(entity.getStatus())) {
            return;
        }

        entity.setStatus(newStatus);
        ChatMessageEntity saved = chatMessageRepository.save(entity);

        ChatMessage response = toChatMessage(saved);

        // Notify both users about the updated status
        messagingTemplate.convertAndSend(
                "/topic/private/" + saved.getSender(),
                response
        );

        messagingTemplate.convertAndSend(
                "/topic/private/" + saved.getReceiver(),
                response
        );
    }

    // CONVERT DATABASE ENTITY TO CHAT MESSAGE
    private ChatMessage toChatMessage(ChatMessageEntity entity) {

        ChatMessage message = new ChatMessage();

        message.setId(entity.getId());
        message.setSender(entity.getSender());
        message.setReceiver(entity.getReceiver());
        message.setContent(entity.getContent());
        message.setRoom(entity.getRoom());
        message.setStatus(entity.getStatus());

        return message;
    }

    // GROUP CHAT HISTORY
    @GetMapping("/api/messages")
    public List<ChatMessageEntity> getMessages(
            @RequestParam String room) {

        return chatMessageRepository.findAll()
                .stream()
                .filter(message -> room.equals(message.getRoom()))
                .sorted(Comparator.comparing(
                        ChatMessageEntity::getId))
                .toList();
    }

    // PRIVATE CHAT HISTORY
    @GetMapping("/api/private-messages")
    public List<ChatMessageEntity> getPrivateMessages(
            @RequestParam String user1,
            @RequestParam String user2) {

        return chatMessageRepository.findAll()
                .stream()
                .filter(message ->
                        "private".equals(message.getRoom()))
                .filter(message ->
                        (user1.equals(message.getSender())
                                && user2.equals(message.getReceiver()))
                                ||
                                (user2.equals(message.getSender())
                                        && user1.equals(message.getReceiver())))
                .sorted(Comparator.comparing(
                        ChatMessageEntity::getId))
                .toList();
    }
}