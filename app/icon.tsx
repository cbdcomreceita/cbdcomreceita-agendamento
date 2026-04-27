import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4e5f50",
          color: "#f2efe8",
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          fontFamily: "system-ui, sans-serif",
          borderRadius: 12,
        }}
      >
        CBD
      </div>
    ),
    { ...size }
  );
}
