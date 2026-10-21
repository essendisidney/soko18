import QRCode from "qrcode";

/** The QR code on a printed campus poster, as an SVG string (crisp at any print size). */
export function posterQrSvg(url: string) {
  return QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#070708", light: "#ffffff" } });
}
