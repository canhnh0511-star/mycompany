package com.mycompany.api.entity.support;

import com.mycompany.api.entity.RecordStatus;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class RecordStatusConverter extends LowercaseEnumConverter<RecordStatus> {
    public RecordStatusConverter() {
        super(RecordStatus.class);
    }
}
