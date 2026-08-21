import type { SVGProps } from "react";

/**
 * A small hand-rolled icon set. The legacy app pulled in three icon libraries
 * (lucide-react, react-icons, bootstrap-icons) for a couple of dozen glyphs;
 * these are the ones actually used, at zero dependency cost.
 */

export type IconName =
  | "arrow-right"
  | "calendar"
  | "check"
  | "chevron-down"
  | "clock"
  | "compass"
  | "activity"
  | "heart"
  | "users"
  | "briefcase"
  | "map-pin"
  | "mail"
  | "phone"
  | "menu"
  | "x"
  | "search"
  | "sun"
  | "moon"
  | "upload"
  | "external"
  | "sparkles"
  | "whatsapp"
  | "linkedin"
  | "alert"
  | "trash"
  | "pencil"
  | "plus"
  | "logout"
  | "inbox"
  | "layout"
  | "message-circle"
  | "dollar-sign"
  | "scan"
  | "life-buoy"
  | "settings"
  | "move"
  | "pointer"
  | "minus"
  | "arrow-up-right"
  | "square"
  | "ruler"
  | "download"
  | "type"
  | "layers"
  | "image"
  | "grid"
  | "star";

const paths: Record<IconName, string> = {
  "arrow-right": "M5 12h14M13 6l6 6-6 6",
  calendar:
    "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  check: "M20 6L9 17l-5-5",
  "chevron-down": "M6 9l6 6 6-6",
  clock: "M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  compass: "M21 12a9 9 0 11-18 0 9 9 0 0118 0zM16 8l-2.5 5.5L8 16l2.5-5.5L16 8z",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  heart:
    "M20.8 5.6a5.5 5.5 0 00-7.8 0L12 6.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 000-7.8z",
  users:
    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M13 7a4 4 0 11-8 0 4 4 0 018 0zM23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8",
  briefcase:
    "M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M2 13a20 20 0 0020 0M4 6h16a2 2 0 012 2v11a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z",
  "map-pin": "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM15 10a3 3 0 11-6 0 3 3 0 016 0z",
  mail: "M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zM22 7l-10 6L2 7",
  phone:
    "M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.2a2 2 0 012.1-.5c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z",
  menu: "M3 6h18M3 12h18M3 18h18",
  x: "M18 6L6 18M6 6l12 12",
  search: "M21 21l-4.3-4.3M17 11a6 6 0 11-12 0 6 6 0 0112 0z",
  sun: "M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  external: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3",
  sparkles:
    "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z",
  whatsapp:
    "M3 21l1.7-5A9 9 0 1112 21a9 9 0 01-4.6-1.3L3 21zM8.5 8.5c-.3.7-.1 1.6.4 2.4a9 9 0 003.7 3.4c1 .5 1.9.6 2.5.2l.9-.7-1.6-1.6-1 .5a6 6 0 01-2.3-2.3l.5-1L10 7.8l-.7.7z",
  linkedin:
    "M4.5 3.5a1.8 1.8 0 100 3.6 1.8 1.8 0 000-3.6zM3 9h3v12H3V9zM9 9h2.9v1.7A3.2 3.2 0 0115 9c3 0 3.6 1.9 3.6 4.5V21h-3v-6.4c0-1.5-.3-2.6-1.8-2.6s-2.1 1-2.1 2.5V21H9V9z",
  alert: "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  trash: "M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6",
  pencil: "M17 3a2.8 2.8 0 014 4L7.5 20.5 2 22l1.5-5.5L17 3z",
  plus: "M12 5v14M5 12h14",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  inbox:
    "M22 12h-6l-2 3h-4l-2-3H2M5.5 5.1L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.5-6.9A2 2 0 0016.8 4H7.2a2 2 0 00-1.7 1.1z",
  layout: "M3 3h18v18H3zM3 9h18M9 21V9",
  "message-circle":
    "M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.5 8.5 0 018 8v.5z",
  "dollar-sign": "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  scan: "M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M3 12h18",
  "life-buoy":
    "M12 22a10 10 0 100-20 10 10 0 000 20zM4.9 4.9l4.24 4.24M14.86 14.86l4.24 4.24M14.86 9.14l4.24-4.24M4.9 19.1l4.24-4.24M12 16a4 4 0 100-8 4 4 0 000 8z",
  settings:
    "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82A1.65 1.65 0 003 15.09H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  // Added for the Space Layout CAD annotation toolbar (Phase 8h).
  move: "M5 9L2 12l3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20",
  pointer: "M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3zM13 13l6 6",
  minus: "M5 12h14",
  "arrow-up-right": "M7 17L17 7M7 7h10v10",
  square: "M3 3h18v18H3z",
  ruler:
    "M3 17L17 3l4 4L7 21l-4-4zM14.5 5.5l2 2M11.5 8.5l2 2M8.5 11.5l2 2M5.5 14.5l2 2",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 11l5 5 5-5M12 4v12",
  type: "M4 7V4h16v3M9 20h6M12 4v16",
  // Landing page section nav.
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  image:
    "M3 3h18v18H3zM3 15l5-5 4 4 3-3 6 6M14 8.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  // Blog feedback star rating.
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
};

export function Icon({
  name,
  size = 20,
  filled = false,
  ...props
}: { name: IconName; size?: number; filled?: boolean } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
