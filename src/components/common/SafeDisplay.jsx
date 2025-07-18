import React from 'react';
import { safeText } from '../../utils/productUtils';

const SafeDisplay = ({ value, fallback = 'N/A' }) => {
  return <>{safeText(value, fallback)}</>;
};

export default SafeDisplay;