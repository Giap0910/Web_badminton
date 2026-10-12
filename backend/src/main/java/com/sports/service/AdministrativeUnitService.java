package com.sports.service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sports.exception.BadRequestException;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import java.io.IOException;
import java.util.List;

@Service
public class AdministrativeUnitService {
    public record Province(String code, String name) {}
    public record Ward(String code, String name, String provinceCode) {}
    public record Catalog(String source, String asOf, List<Province> provinces, List<Ward> wards) {}
    private final Catalog catalog;
    public AdministrativeUnitService() throws IOException {
        try (var stream = new ClassPathResource("vietnam-administrative-units.json").getInputStream()) {
            catalog = new ObjectMapper().readValue(stream, Catalog.class);
        }
    }
    public Catalog getCatalog() { return catalog; }
    public Province province(String code) {
        return catalog.provinces().stream().filter(p -> p.code().equals(code)).findFirst()
                .orElseThrow(() -> new BadRequestException("Mã tỉnh/thành phố không hợp lệ"));
    }
    public Ward ward(String provinceCode, String wardCode) {
        province(provinceCode);
        return catalog.wards().stream().filter(w -> w.code().equals(wardCode) && w.provinceCode().equals(provinceCode))
                .findFirst().orElseThrow(() -> new BadRequestException("Phường/xã không thuộc tỉnh/thành phố đã chọn"));
    }
}
