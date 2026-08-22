package com.mycompany.api.entity.support;

import com.mycompany.api.entity.BatchStatus;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class BatchStatusConverter extends LowercaseEnumConverter<BatchStatus> {
    public BatchStatusConverter() {
        super(BatchStatus.class);
    }
}
