package com.mycompany.api.entity.support;

import com.mycompany.api.entity.TechnicalGrade;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class TechnicalGradeConverter extends LowercaseEnumConverter<TechnicalGrade> {
    public TechnicalGradeConverter() {
        super(TechnicalGrade.class);
    }
}
