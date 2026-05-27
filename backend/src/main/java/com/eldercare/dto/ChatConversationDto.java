package com.eldercare.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatConversationDto {
    private Long id;
    private Long elderlyId;
    private String elderlyName;
    private Long caregiverId;
    private String caregiverName;
    private String lastMessageText;
    private String lastMessageAt;
}

