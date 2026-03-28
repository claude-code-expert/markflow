'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // react-grab: dev 환경에서만 활성화
  // react-grab 0.1.29 버그: KeyboardEvent.code가 undefined일 때 .startsWith() 크래시
  // 전역 에러 핸들러로 방어
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    function suppressReactGrabError(e: ErrorEvent) {
      // react-grab 0.1.29 키보드 핸들러 버그만 억제 (소스 파일 확인)
      if (
        e.message?.includes("Cannot read properties of undefined (reading 'startsWith')")
      ) {
        e.preventDefault();
      }
    }
    window.addEventListener('error', suppressReactGrabError);

    import('react-grab')
      .then(({ init }) => {
        // Patch KeyboardEvent.code before init to prevent startsWith crash
        const origAddEventListener = document.addEventListener.bind(document);
        document.addEventListener = function(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
          if (type === 'keydown' || type === 'keyup') {
            const wrapped = function(this: Document, e: Event) {
              if (e instanceof KeyboardEvent && typeof e.code === 'undefined') return;
              if (typeof listener === 'function') listener.call(this, e);
              else listener.handleEvent(e);
            };
            return origAddEventListener(type, wrapped, options);
          }
          return origAddEventListener(type, listener, options);
        } as typeof document.addEventListener;
        init();
      })
      .catch((err) => console.warn('[react-grab] init failed:', err));

    return () => window.removeEventListener('error', suppressReactGrabError);
  }, []);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
