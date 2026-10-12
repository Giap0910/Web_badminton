package com.sports.service;
import com.sports.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class AdministrativeUnitServiceTest {
    @Test void currentOfficialCatalogIsCompleteAndHasUserExamples() throws Exception {
        var service = new AdministrativeUnitService();
        assertEquals(34, service.getCatalog().provinces().size());
        assertEquals(3321, service.getCatalog().wards().size());
        assertEquals("2026-10-12", service.getCatalog().asOf());
        assertEquals("Xã Quốc Oai", service.ward("01", "09895").name());
        assertEquals("Xã Hưng Đạo", service.ward("01", "09931").name());
        assertEquals(3321, service.getCatalog().wards().stream().map(AdministrativeUnitService.Ward::code).distinct().count());
        service.getCatalog().wards().forEach(w -> assertNotNull(service.province(w.provinceCode())));
    }
    @Test void wrongProvinceWardPairIsRejected() throws Exception {
        var service = new AdministrativeUnitService();
        assertThrows(BadRequestException.class, () -> service.ward("79", "09895"));
        assertThrows(BadRequestException.class, () -> service.ward("99", "09895"));
    }
}
