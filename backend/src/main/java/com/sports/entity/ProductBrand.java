package com.sports.entity;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

public enum ProductBrand {
    YONEX("Yonex"), VICTOR("Victor"), LI_NING("Li-Ning", "Lining"),
    MIZUNO("Mizuno"), KAWASAKI("Kawasaki"), FLEET("Fleet");

    private final List<String> names;

    ProductBrand(String... names) {
        this.names = List.of(names);
    }

    public static String canonicalName(String value) {
        if (value == null) return null;
        for (ProductBrand brand : values()) {
            if (brand.names.stream().anyMatch(name -> name.equalsIgnoreCase(value.trim()))) {
                return brand.names.get(0);
            }
        }
        return value.trim();
    }

    public static List<String> databaseNames() {
        return Arrays.stream(values()).flatMap(brand -> brand.names.stream())
                .map(name -> name.toLowerCase(Locale.ROOT)).toList();
    }

    public static boolean isSupported(String value) {
        return value != null && databaseNames().contains(value.trim().toLowerCase(Locale.ROOT));
    }
}
