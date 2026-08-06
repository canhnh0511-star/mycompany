package com.mycompany.api.entity.support;

import com.mycompany.api.entity.EmployeeStatus;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class EmployeeStatusConverter extends LowercaseEnumConverter<EmployeeStatus> {
    public EmployeeStatusConverter() {
        super(EmployeeStatus.class);
    }
}
