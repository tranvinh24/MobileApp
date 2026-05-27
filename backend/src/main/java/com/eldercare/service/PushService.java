package com.eldercare.service;

import com.eldercare.repository.DeviceTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PushService {

    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    private final DeviceTokenRepository deviceTokenRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    public void sendToUsers(List<Long> userIds, String title, String body, Map<String, Object> data) {
        if (userIds == null || userIds.isEmpty()) return;
        Set<String> tokens = new HashSet<>();
        for (Long userId : userIds) {
            deviceTokenRepository.findByUserIdAndRevokedAtIsNull(userId)
                    .stream()
                    .map(dt -> dt.getToken())
                    .filter(t -> t != null && t.startsWith("ExponentPushToken"))
                    .forEach(tokens::add);
        }
        if (tokens.isEmpty()) return;
        sendPush(new ArrayList<>(tokens), title, body, data);
    }

    public void sendToUser(Long userId, String title, String body, Map<String, Object> data) {
        sendToUsers(List.of(userId), title, body, data);
    }

    private void sendPush(List<String> tokens, String title, String body, Map<String, Object> data) {
        if (tokens.isEmpty()) return;
        try {
            Map<String, Object> message = new HashMap<>();
            message.put("to", tokens.size() == 1 ? tokens.get(0) : tokens);
            message.put("title", title);
            message.put("body", body);
            message.put("sound", "default");
            message.put("priority", "high");
            message.put("channelId", "sos-alerts");
            if (data != null && !data.isEmpty()) {
                message.put("data", data);
            }
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(message, headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    EXPO_PUSH_URL,
                    HttpMethod.POST,
                    entity,
                    String.class
            );
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Push sent to {} tokens", tokens.size());
            } else {
                log.warn("Push response: {}", response.getBody());
            }
        } catch (Exception e) {
            log.error("Failed to send push: {}", e.getMessage());
        }
    }
}
