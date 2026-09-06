package com.sports.controller;

import com.sports.dto.RacketComparisonResponse;
import com.sports.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comparison")
@RequiredArgsConstructor
public class ComparisonController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<RacketComparisonResponse> compareRackets(@RequestParam List<Long> ids) {
        return ResponseEntity.ok(productService.compareRackets(ids));
    }
}
