package com.sports.controller;

import com.sports.dto.ShippingAddressDto;
import com.sports.security.CustomUserDetails;
import com.sports.service.ShippingAddressService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shipping-addresses")
@RequiredArgsConstructor
public class ShippingAddressController {

    private final ShippingAddressService shippingAddressService;

    @GetMapping
    public ResponseEntity<List<ShippingAddressDto>> getMyAddresses(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(shippingAddressService.getUserAddresses(userDetails.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShippingAddressDto> getAddressById(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(shippingAddressService.getAddressById(id, userDetails.getId()));
    }

    @PostMapping
    public ResponseEntity<ShippingAddressDto> createAddress(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ShippingAddressDto dto
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(shippingAddressService.createAddress(userDetails.getId(), dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ShippingAddressDto> updateAddress(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ShippingAddressDto dto
    ) {
        return ResponseEntity.ok(shippingAddressService.updateAddress(id, userDetails.getId(), dto));
    }

    @PatchMapping("/{id}/default")
    public ResponseEntity<ShippingAddressDto> setDefaultAddress(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(shippingAddressService.setDefaultAddress(id, userDetails.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAddress(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        shippingAddressService.deleteAddress(id, userDetails.getId());
        return ResponseEntity.noContent().build();
    }
}
