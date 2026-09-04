package com.mycompany.api.repository;

import com.mycompany.api.entity.PayrollSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayrollSettingRepository extends JpaRepository<PayrollSetting, String> {
}
