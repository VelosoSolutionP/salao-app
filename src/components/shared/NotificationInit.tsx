"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export function NotificationInit() {
  const { data: session } = useSession();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !session?.user) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    done.current = true;

    async function register() {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return;

        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();

        const sub =
          existing ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
            ),
          }));

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        });
      } catch (e) {
        console.warn("[Push] Error registering:", e);
      }
    }

    // Delay a bit so the page loads first
    const t = setTimeout(register, 3000);
    return () => clearTimeout(t);
  }, [session]);

  return null;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
