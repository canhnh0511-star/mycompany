package com.mycompany.api.entity.support;

import com.mycompany.api.entity.DateVerificationStatus;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class DateVerificationStatusConverter extends LowercaseEnumConverter<DateVerificationStatus> {
    public DateVerificationStatusConverter() {
        super(DateVerificationStatus.class);
    }
}
