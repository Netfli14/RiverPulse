"use client";

import type {ComponentProps, MouseEvent} from "react";
import {appDestination} from "@/lib/app-navigation";

export function AppLink({href, onClick, target, download, ...props}: ComponentProps<"a"> & {href: string}) {
  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (target && target !== "_self") || download != null) return;
    const destination = appDestination(href, window.location.href);
    if (!destination) return;
    event.preventDefault();
    if (destination !== window.location.pathname + window.location.search) {
      // Both Next.js and Vinext integrate native history with usePathname.
      // No document reload: the root BLE connection stays mounted.
      window.history.pushState(null, "", destination);
    }
    window.scrollTo({top: 0, left: 0, behavior: "instant"});
  }
  return <a {...props} href={href} target={target} download={download} onClick={navigate}/>;
}
