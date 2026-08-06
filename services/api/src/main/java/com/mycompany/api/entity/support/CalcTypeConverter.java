package com.mycompany.api.entity.support;

import com.mycompany.api.entity.CalcType;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class CalcTypeConverter extends LowercaseEnumConverter<CalcType> {
    public CalcTypeConverter() {
        super(CalcType.class);
    }
}
