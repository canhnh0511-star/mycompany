package com.mycompany.api.entity.support;

import com.mycompany.api.entity.RecordSource;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class RecordSourceConverter extends LowercaseEnumConverter<RecordSource> {
    public RecordSourceConverter() {
        super(RecordSource.class);
    }
}
