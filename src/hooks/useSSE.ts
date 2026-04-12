"use client";

import { useEffect } from "react";

export function useSSE(onEvent: (event: MessageEvent) => void) {
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource("/api/sse");

      es.onmessage = onEvent;

      es.onerror = () => {
        es?.close();
        // Reconnect after 5s on error
        retryTimeout = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      es?.close();
      clearTimeout(retryTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
