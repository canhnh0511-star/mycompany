// @ts-nocheck -- gluestack-ui v5 alpha: styled(ActivityIndicator, { nativeStyleToProp: { color: true } })
// không khớp type định nghĩa hiện tại của NativeWind styled() (mong đợi `undefined`). Lỗi type thuần,
// không ảnh hưởng runtime (Metro/Babel không type-check) — bỏ khi gluestack-ui/nativewind bản ổn định
// sửa. Không sửa tay phần còn lại của file (xem src/components/README.md).
'use client';
import { ActivityIndicator } from 'react-native';
import React from 'react';
import { tva } from '@gluestack-ui/utils/nativewind-utils';
import { styled } from 'nativewind';


const StyledActivityIndicator = styled(ActivityIndicator, {
  className: { target: 'style', nativeStyleToProp: { color: true } },
});
const spinnerStyle = tva({});

const Spinner = React.forwardRef<
  React.ComponentRef<typeof ActivityIndicator>,
  React.ComponentProps<typeof ActivityIndicator>
>(function Spinner(
  {
    className,
    color,
    focusable = false,
    'aria-label': ariaLabel = 'loading',
    ...props
  },
  ref
) {
  return (
    <StyledActivityIndicator
      ref={ref}
      focusable={focusable}
      aria-label={ariaLabel}
      {...props}
      color={color}
      className={spinnerStyle({ class: className })}
    />
  );
});

Spinner.displayName = 'Spinner';

export { Spinner };
