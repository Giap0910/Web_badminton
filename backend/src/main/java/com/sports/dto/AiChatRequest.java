package com.sports.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Getter @Setter @NoArgsConstructor
public class AiChatRequest {
    @NotBlank(message = "Nội dung câu hỏi không được để trống")
    @Size(max = 2000, message = "Câu hỏi tối đa 2.000 ký tự")
    private String message;
    @Valid @NotNull @Size(max = 6)
    private List<HistoryMessage> history = new ArrayList<>();
    public AiChatRequest(String message) { this.message = message; }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class HistoryMessage {
        @NotBlank @Pattern(regexp = "user|model")
        private String role;
        @NotBlank @Size(max = 2000)
        private String text;
    }
}
