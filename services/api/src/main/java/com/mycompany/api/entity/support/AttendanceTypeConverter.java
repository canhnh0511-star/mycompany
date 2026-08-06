package com.mycompany.api.entity.support;

import com.mycompany.api.entity.AttendanceType;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class AttendanceTypeConverter extends LowercaseEnumConverter<AttendanceType> {
    public AttendanceTypeConverter() {
        super(AttendanceType.class);
    }
}
