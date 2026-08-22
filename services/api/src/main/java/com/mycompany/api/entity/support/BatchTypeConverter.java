package com.mycompany.api.entity.support;

import com.mycompany.api.entity.BatchType;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class BatchTypeConverter extends LowercaseEnumConverter<BatchType> {
    public BatchTypeConverter() {
        super(BatchType.class);
    }
}
