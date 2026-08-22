package com.mycompany.api.entity.support;

import com.mycompany.api.entity.DateResolution;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class DateResolutionConverter extends LowercaseEnumConverter<DateResolution> {
    public DateResolutionConverter() {
        super(DateResolution.class);
    }
}
