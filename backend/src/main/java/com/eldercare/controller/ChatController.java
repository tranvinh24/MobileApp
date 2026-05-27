package com.eldercare.controller;

import com.eldercare.dto.*;
import com.eldercare.security.CurrentUser;
import com.eldercare.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<ChatConversationDto>>> list(@AuthenticationPrincipal CurrentUser currentUser) {
        if (currentUser == null) return ResponseEntity.status(401).body(ApiResponse.error("Chưa đăng nhập"));
        return ResponseEntity.ok(ApiResponse.success(chatService.listConversations(currentUser.getUserId())));
    }

    @GetMapping("/conversations/{id}/messages")
    public ResponseEntity<ApiResponse<List<ChatMessageDto>>> messages(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable("id") Long conversationId,
            @RequestParam(required = false, defaultValue = "30") Integer limit
    ) {
        if (currentUser == null) return ResponseEntity.status(401).body(ApiResponse.error("Chưa đăng nhập"));
        List<ChatMessageDto> list = chatService.getMessages(conversationId, currentUser.getUserId(), limit == null ? 30 : limit);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PostMapping("/conversations/{id}/messages")
    public ResponseEntity<ApiResponse<ChatMessageDto>> send(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable("id") Long conversationId,
            @Valid @RequestBody SendMessageRequest request
    ) {
        if (currentUser == null) return ResponseEntity.status(401).body(ApiResponse.error("Chưa đăng nhập"));
        ChatMessageDto dto = chatService.sendText(conversationId, currentUser.getUserId(), request.getText());
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @PostMapping("/conversations/{id}/messages/image")
    public ResponseEntity<ApiResponse<ChatMessageDto>> sendImage(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable("id") Long conversationId,
            @RequestPart("image") MultipartFile image,
            @RequestPart(value = "text", required = false) String text
    ) {
        if (currentUser == null) return ResponseEntity.status(401).body(ApiResponse.error("Chưa đăng nhập"));
        if (image == null || image.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Thiếu ảnh"));
        }
        ChatMessageDto dto = chatService.sendImage(conversationId, currentUser.getUserId(), image, text);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @PostMapping("/conversations/{id}/messages/{messageId}/meal-analysis")
    public ResponseEntity<ApiResponse<ChatMessageDto>> analyzeMeal(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable("id") Long conversationId,
            @PathVariable Long messageId
    ) {
        if (currentUser == null) return ResponseEntity.status(401).body(ApiResponse.error("Chưa đăng nhập"));
        ChatMessageDto dto = chatService.analyzeMealImageForMessage(conversationId, messageId, currentUser.getUserId());
        return ResponseEntity.ok(ApiResponse.success(dto));
    }
}

