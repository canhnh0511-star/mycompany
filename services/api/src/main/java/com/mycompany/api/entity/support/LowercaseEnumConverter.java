package com.mycompany.api.entity.support;

import jakarta.persistence.AttributeConverter;

/**
 * Map enum Java (UPPER_SNAKE_CASE) ↔ giá trị VARCHAR trong DB (lower_snake_case, dùng trong CHECK
 * constraint của migration). Quy ước: giá trị DB LUÔN = enum.name().toLowerCase() — không có enum nào
 * lệch quy ước này (xem 001_init_schema.sql).
 */
public abstract class LowercaseEnumConverter<E extends Enum<E>> implements AttributeConverter<E, String> {

    private final Class<E> enumClass;

    protected LowercaseEnumConverter(Class<E> enumClass) {
        this.enumClass = enumClass;
    }

    @Override
    public String convertToDatabaseColumn(E attribute) {
        return attribute == null ? null : attribute.name().toLowerCase();
    }

    @Override
    public E convertToEntityAttribute(String dbData) {
        return dbData == null ? null : Enum.valueOf(enumClass, dbData.toUpperCase());
    }
}
