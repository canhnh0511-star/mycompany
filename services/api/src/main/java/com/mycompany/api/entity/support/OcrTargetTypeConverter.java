package com.mycompany.api.entity.support;

import com.mycompany.api.entity.OcrTargetType;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class OcrTargetTypeConverter extends LowercaseEnumConverter<OcrTargetType> {
    public OcrTargetTypeConverter() {
        super(OcrTargetType.class);
    }
}
