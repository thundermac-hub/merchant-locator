'use client';

import { useEffect, useState } from 'react';

const REDIRECT_URL = 'https://getslurp.com/slurp-merchant-location/';

const shellStyle = {
  minHeight: '100vh',
  background: '#f5f6f8',
};

export default function DirectVisitRedirectGate({ children }) {
  const [shouldRenderChildren, setShouldRenderChildren] = useState(false);

  useEffect(() => {
    if (window.self !== window.top) {
      setShouldRenderChildren(true);
      return;
    }

    window.location.replace(REDIRECT_URL);
  }, []);

  if (!shouldRenderChildren) {
    return <div style={shellStyle} aria-hidden="true" />;
  }

  return children;
}
