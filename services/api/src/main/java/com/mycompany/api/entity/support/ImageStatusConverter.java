package com.mycompany.api.entity.support;

import com.mycompany.api.entity.ImageStatus;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class ImageStatusConverter extends LowercaseEnumConverter<ImageStatus> {
    public ImageStatusConverter() {
        super(ImageStatus.class);
    }
}
