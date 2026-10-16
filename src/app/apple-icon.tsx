import { ImageResponse } from "next/og";

// iOS ignores SVG home-screen icons; this draws the same mark as icon.svg to a PNG (full bleed:
// iOS rounds the corners itself).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "linear-gradient(135deg, #c8462f, #7d2415)",
      }}
    >
      <svg viewBox="0 0 64 64" width="180" height="180" role="img" aria-label="vo2">
        <path
          d="M13 49h38"
          stroke="#fbf1e6"
          strokeOpacity="0.3"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M14 49C19.5 33 25.5 23 34 20.7S46 18.5 49.5 18.5"
          fill="none"
          stroke="#fbf1e6"
          strokeWidth="4.2"
          strokeLinecap="round"
        />
        <circle cx="49.5" cy="18.5" r="4.6" fill="#fbf1e6" />
      </svg>
    </div>,
    size,
  );
}
