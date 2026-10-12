package com.sports.controller;
import com.sports.service.AdministrativeUnitService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/administrative-units")
@RequiredArgsConstructor
public class AdministrativeUnitController {
    private final AdministrativeUnitService service;
    @GetMapping public AdministrativeUnitService.Catalog catalog() { return service.getCatalog(); }
    @GetMapping("/provinces") public List<AdministrativeUnitService.Province> provinces() {
        return service.getCatalog().provinces();
    }
    @GetMapping("/provinces/{code}/wards")
    public List<AdministrativeUnitService.Ward> wards(@PathVariable String code) {
        service.province(code);
        return service.getCatalog().wards().stream().filter(w -> w.provinceCode().equals(code)).toList();
    }
}
