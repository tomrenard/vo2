import { ImageResponse } from "next/og";
import { SPLASH_SIZES } from "@/lib/iphones";

// Built once at build time; any other size is a 404, so nobody can make the server render.
export const dynamicParams = false;
export const generateStaticParams = () => SPLASH_SIZES.map((size) => ({ size }));

/** Launch screen for one iPhone size ("1179x2556"): the icon's oxblood, its curve on a glass tile. */
export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const [w = 0, h = 0] = (await params).size.split("x").map(Number);
  const mark = Math.round(w * 0.3);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #c8462f, #a8321e 55%, #6e1f12)",
      }}
    >
      <div
        style={{
          width: mark,
          height: mark,
          borderRadius: Math.round(mark * 0.28),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, rgba(255,255,255,.36), rgba(255,255,255,.08))",
          border: "3px solid rgba(255,255,255,.5)",
        }}
      >
        <svg viewBox="0 0 64 64" width={mark * 0.8} height={mark * 0.8} role="img" aria-label="vo2">
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
      </div>
    </div>,
    { width: w, height: h, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
