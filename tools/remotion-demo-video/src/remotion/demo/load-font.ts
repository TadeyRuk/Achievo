import { loadFont as loadDisplayFont } from "@remotion/google-fonts/PlusJakartaSans";
import { loadFont as loadBodyFont } from "@remotion/google-fonts/BeVietnamPro";

export const { fontFamily } = loadDisplayFont("normal", {
  weights: ["500", "600", "700", "800"],
  subsets: ["latin"],
});

export const { fontFamily: bodyFontFamily } = loadBodyFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
