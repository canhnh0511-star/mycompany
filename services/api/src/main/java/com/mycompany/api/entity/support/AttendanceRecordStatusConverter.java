package com.mycompany.api.entity.support;

import com.mycompany.api.entity.AttendanceRecordStatus;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class AttendanceRecordStatusConverter extends LowercaseEnumConverter<AttendanceRecordStatus> {
    public AttendanceRecordStatusConverter() {
        super(AttendanceRecordStatus.class);
    }
}
