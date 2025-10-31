import { useEffect, useRef } from 'react';

const RenderDebug = ({ componentName }) => {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    console.log(`${componentName} rendered ${renderCount.current} times`);
  });
  
  return null; // This component doesn't render anything
};

export default RenderDebug;