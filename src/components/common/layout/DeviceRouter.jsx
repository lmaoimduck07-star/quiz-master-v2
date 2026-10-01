import React from 'react';
import { useDevice } from '../../../hooks/useDevice';

export function DeviceRouter({ pc: PC, mobile: Mobile, ...props }) {
  const { isMobile } = useDevice();

  if (isMobile && Mobile) {
    return React.isValidElement(Mobile)
      ? React.cloneElement(Mobile, props)
      : <Mobile {...props} />;
  }

  return React.isValidElement(PC)
    ? React.cloneElement(PC, props)
    : <PC {...props} />;
}
