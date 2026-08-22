package com.mycompany.api.entity.support;

import com.mycompany.api.entity.ConflictType;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class ConflictTypeConverter extends LowercaseEnumConverter<ConflictType> {
    public ConflictTypeConverter() {
        super(ConflictType.class);
    }
}
