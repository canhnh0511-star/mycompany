package com.mycompany.api.entity.support;

import com.mycompany.api.entity.UserRole;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class UserRoleConverter extends LowercaseEnumConverter<UserRole> {
    public UserRoleConverter() {
        super(UserRole.class);
    }
}
