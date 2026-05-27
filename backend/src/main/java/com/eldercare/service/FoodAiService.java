package com.eldercare.service;

import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Part;
import com.eldercare.model.SystemConfig;
import com.eldercare.repository.SystemConfigRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class FoodAiService {

    private final SystemConfigRepository systemConfigRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ai.openai.apiKey:}")
    private String openAiApiKeyFromProps;

    @Value("${ai.openai.model:gpt-4o-mini}")
    private String openAiModel;

    @Value("${ai.google.apiKey:}")
    private String googleApiKeyFromProps;

    @Value("${ai.google.model:gemini-2.5-flash}")
    private String googleModel;

    @Data
    @Builder
    @AllArgsConstructor
    public static class FoodAiResult {
        private String foodItemsJson;
        private String note;
    }

    public Optional<FoodAiResult> analyzeMealImage(byte[] imageBytes, String mimeType) {
        String provider = getConfig("ai_provider").orElse("openai").trim().toLowerCase();
        if (provider.equals("google") || provider.equals("gemini") || provider.equals("google_ai_studio")) {
            return analyzeWithGemini(imageBytes, mimeType);
        }
        if (!provider.equals("openai")) return Optional.empty();

        String apiKey = getConfigAny("ai_api_key", "ai_openai_api_key").orElse(openAiApiKeyFromProps);
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("FoodAiService(OpenAI) missing API key. Expected config key: ai_api_key (or ai_openai_api_key).");
            return Optional.empty();
        }

        String prompt = getConfig("ai_food_prompt_template").orElse(
                "Bạn là chuyên gia dinh dưỡng. Hãy đọc ảnh bữa ăn và trả về JSON liệt kê các món ăn/đồ uống nhìn thấy.\n" +
                        "Yêu cầu:\n" +
                        "- Chỉ trả về JSON thuần, không markdown.\n" +
                        "- Format: {\"items\":[{\"name\":\"...\",\"confidence\":0.0}],\"note\":\"...\"}\n" +
                        "- note: 1 câu ngắn mô tả tổng quan.\n"
        );
        String model = getConfigAny("ai_openai_model", "ai_model").orElse(openAiModel).trim();
        if (model.isBlank()) model = "gpt-4o-mini";

        String b64 = Base64.getEncoder().encodeToString(imageBytes);
        String dataUrl = "data:" + (mimeType == null || mimeType.isBlank() ? "image/jpeg" : mimeType) + ";base64," + b64;

        try {
            Map<String, Object> payload = Map.of(
                    "model", model,
                    "messages", List.of(
                            Map.of(
                                    "role", "user",
                                    "content", List.of(
                                            Map.of("type", "text", "text", prompt),
                                            Map.of("type", "image_url", "image_url", Map.of("url", dataUrl))
                                    )
                            )
                    ),
                    "temperature", 0.2
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey.trim());
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

            ResponseEntity<Map<String, Object>> res = restTemplate.exchange(
                    "https://api.openai.com/v1/chat/completions",
                    HttpMethod.POST,
                    entity,
                    new ParameterizedTypeReference<>() {}
            );
            if (!res.getStatusCode().is2xxSuccessful() || res.getBody() == null) {
                return Optional.empty();
            }

            Object choicesObj = res.getBody().get("choices");
            if (!(choicesObj instanceof List<?> choices) || choices.isEmpty()) return Optional.empty();
            Object first = choices.get(0);
            if (!(first instanceof Map<?, ?> firstMap)) return Optional.empty();
            Object messageObj = firstMap.get("message");
            if (!(messageObj instanceof Map<?, ?> msgMap)) return Optional.empty();
            Object contentObj = msgMap.get("content");
            if (!(contentObj instanceof String content)) return Optional.empty();

            String json = content.trim();
            return Optional.of(FoodAiResult.builder()
                    .foodItemsJson(json)
                    .note(null)
                    .build());
        } catch (HttpStatusCodeException e) {
            // log body để dễ debug key / quota / model / policy
            String body = null;
            try { body = e.getResponseBodyAsString(); } catch (Exception ignored) {}
            log.warn("FoodAiService http error: status={} body={}", e.getStatusCode(), body);
            return Optional.empty();
        } catch (Exception e) {
            log.warn("FoodAiService analyze failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private Optional<FoodAiResult> analyzeWithGemini(byte[] imageBytes, String mimeType) {
        String apiKey = getConfigAny("ai_google_api_key", "ai_gemini_api_key").orElse(googleApiKeyFromProps);
        if (apiKey == null || apiKey.isBlank()) {
            // Match Google doc behavior: also accept env vars
            String envGoogle = System.getenv("GOOGLE_API_KEY");
            String envLegacy = System.getenv("GEMINI_API_KEY");
            apiKey = (envGoogle != null && !envGoogle.isBlank()) ? envGoogle : envLegacy;
        }
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("FoodAiService(Gemini) missing API key. Expected config key: ai_google_api_key.");
            return Optional.empty();
        }

        String prompt = getConfig("ai_food_prompt_template").orElse(
                "Bạn là chuyên gia dinh dưỡng. Hãy đọc ảnh bữa ăn và trả về JSON liệt kê các món ăn/đồ uống nhìn thấy.\n" +
                        "Yêu cầu:\n" +
                        "- Chỉ trả về JSON thuần, không markdown.\n" +
                        "- Format: {\"items\":[{\"name\":\"...\",\"confidence\":0.0}],\"note\":\"...\"}\n" +
                        "- note: 1 câu ngắn mô tả tổng quan.\n"
        );

        String model = getConfig("ai_google_model").orElse(googleModel).trim();
        if (model.isBlank()) model = "gemini-2.5-flash";

        String mt = (mimeType == null || mimeType.isBlank()) ? "image/jpeg" : mimeType;

        try {
            Client client = Client.builder().apiKey(apiKey.trim()).build();
            Content content = Content.fromParts(
                    Part.fromText(prompt),
                    Part.fromBytes(imageBytes, mt)
            );
            List<String> modelCandidates = new ArrayList<>();
            modelCandidates.add(model);
            // Some preview names may be unavailable for API-key projects; try stable fallback automatically.
            if (model.equalsIgnoreCase("gemini-3-flash-preview")) {
                modelCandidates.add("gemini-2.5-flash");
                modelCandidates.add("gemini-2.5-flash-latest");
            }

            Exception lastError = null;
            for (String candidateModel : modelCandidates) {
                try {
                    GenerateContentResponse response = client.models.generateContent(candidateModel, content, null);
                    String text = response != null ? response.text() : null;
                    if (text == null || text.isBlank()) {
                        try {
                            String finishReason = response != null ? String.valueOf(response.finishReason()) : "null";
                            Object promptFeedback = response != null ? response.promptFeedback().orElse(null) : null;
                            String raw = response != null ? response.toJson() : null;
                            if (raw != null && raw.length() > 4000) raw = raw.substring(0, 4000) + "...(truncated)";
                            log.warn("FoodAiService(GeminiSDK) empty text. model={} finishReason={} promptFeedback={} raw={}",
                                    candidateModel, finishReason, promptFeedback, raw);
                        } catch (Exception ignored) {}
                        continue;
                    }

                    return Optional.of(FoodAiResult.builder()
                            .foodItemsJson(text.trim())
                            .note(null)
                            .build());
                } catch (Exception ex) {
                    lastError = ex;
                    log.warn("FoodAiService(GeminiSDK) model={} failed: {}", candidateModel, ex.getMessage());
                }
            }

            if (lastError != null) {
                log.warn("FoodAiService(GeminiSDK) all model candidates failed. configuredModel={} error={}",
                        model, lastError.getMessage());
            }
            return Optional.empty();
        } catch (Exception e) {
            log.warn("FoodAiService(GeminiSDK) analyze failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private Optional<String> getConfig(String key) {
        try {
            return systemConfigRepository.findByConfigKey(key)
                    .map(SystemConfig::getConfigValue)
                    .filter(v -> v != null && !v.isBlank());
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private Optional<String> getConfigAny(String... keys) {
        if (keys == null) return Optional.empty();
        for (String key : keys) {
            Optional<String> v = getConfig(key);
            if (v.isPresent()) return v;
        }
        return Optional.empty();
    }
}

