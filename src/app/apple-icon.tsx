import { ImageResponse } from "next/og";

// iOS ignores SVG home-screen icons; this renders the same mark as icon.svg to a PNG.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#a8321e",
        color: "#fff",
        fontSize: 96,
        fontFamily: "Georgia, serif",
        paddingBottom: 16,
      }}
    >
      VO<span style={{ fontSize: 60, marginTop: 60 }}>2</span>
    </div>,
    size,
  );
}
