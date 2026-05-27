package com.eldercare.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SendMessageRequest {

    @Size(max = 2000, message = "Nội dung quá dài")
    private String text;
}

