import type { ReactNode } from 'react';

export function Providers({children}: {children: ReactNode}) {
  return (
    <div data-astryx-theme="neutral" data-theme="system" style={{ display: 'contents' }}>
      {children}
    </div>
  );
}
