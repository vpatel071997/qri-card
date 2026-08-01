// Pure builder for qr-code-styling options. Keeping this out of the component
// makes the design → options mapping unit-testable (gradient fills, logo →
// error-correction bump, separate eye colour, transparent background) and lets
// the batch generator reuse the exact same rendering as the live builder.
import { DotType, CornerSquareType, Options } from "qr-code-styling";

export type GradientType = "linear" | "radial";

export interface QrDesign {
  data: string;
  size: number;
  margin?: number;
  dotStyle: DotType;
  cornerStyle: CornerSquareType;
  color: string;
  gradientEnabled: boolean;
  gradientType: GradientType;
  gradientColor2: string;
  // Empty string => corners follow the body colour.
  eyeColor: string;
  // Data URL of a center logo, or "" for none.
  logo: string;
  transparentBg: boolean;
}

// A center logo obscures part of the code, so bump error correction to H
// (~30% recoverable) whenever a logo is present. Without a logo, M is plenty
// and keeps the code less dense / easier to scan.
export function errorCorrectionLevel(design: { logo?: string }): "M" | "H" {
  return design.logo ? "H" : "M";
}

type Fill =
  | { color: string }
  | {
      gradient: {
        type: GradientType;
        rotation: number;
        colorStops: { offset: number; color: string }[];
      };
    };

// Solid colour, or a two-stop gradient when enabled.
export function colorFill(
  color: string,
  gradientEnabled: boolean,
  gradientType: GradientType,
  gradientColor2: string,
): Fill {
  if (!gradientEnabled) return { color };
  return {
    gradient: {
      type: gradientType,
      rotation: 0,
      colorStops: [
        { offset: 0, color },
        { offset: 1, color: gradientColor2 },
      ],
    },
  };
}

export function buildQrOptions(design: QrDesign): Options {
  const body = colorFill(
    design.color,
    design.gradientEnabled,
    design.gradientType,
    design.gradientColor2,
  );
  const eye = design.eyeColor || design.color;
  const cornerDotType: CornerSquareType =
    design.cornerStyle === "square" ? "square" : "dot";

  const options: Record<string, unknown> = {
    width: design.size,
    height: design.size,
    type: "svg",
    data: design.data,
    margin: design.margin ?? 4,
    qrOptions: { errorCorrectionLevel: errorCorrectionLevel(design) },
    backgroundOptions: {
      color: design.transparentBg ? "transparent" : "#ffffff",
    },
    dotsOptions: { type: design.dotStyle, ...body },
    cornersSquareOptions: { type: design.cornerStyle, color: eye },
    cornersDotOptions: { type: cornerDotType, color: eye },
  };

  if (design.logo) {
    options.image = design.logo;
    options.imageOptions = {
      crossOrigin: "anonymous",
      margin: 4,
      imageSize: 0.4,
      hideBackgroundDots: true,
    };
  }

  return options as unknown as Options;
}
