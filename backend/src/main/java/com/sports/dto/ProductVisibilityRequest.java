package com.sports.dto;

import jakarta.validation.constraints.NotNull;

public record ProductVisibilityRequest(@NotNull(message = "catalogVisible không được bỏ trống") Boolean catalogVisible) {
}
