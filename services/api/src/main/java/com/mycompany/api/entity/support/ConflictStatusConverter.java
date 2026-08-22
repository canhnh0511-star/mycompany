package com.mycompany.api.entity.support;

import com.mycompany.api.entity.ConflictStatus;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class ConflictStatusConverter extends LowercaseEnumConverter<ConflictStatus> {
    public ConflictStatusConverter() {
        super(ConflictStatus.class);
    }
}
