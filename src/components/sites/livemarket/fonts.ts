import localFont from "next/font/local";

// Same files and weight declarations the source serves from /fonts/*.
export const pretendard = localFont({
  src: [
    { path: "../../../../public/sites/livemarket/fonts/PretendardRegular.woff2", weight: "400" },
    { path: "../../../../public/sites/livemarket/fonts/PretendardMedium.woff2", weight: "500" },
    { path: "../../../../public/sites/livemarket/fonts/PretendardSemiBold.woff2", weight: "600" },
    { path: "../../../../public/sites/livemarket/fonts/PretendardBold.woff2", weight: "700" },
  ],
  variable: "--lm-font-pretendard",
  display: "swap",
});

// The source maps the Bold file to weight 500 and Medium to 400.
export const gmarketSans = localFont({
  src: [
    { path: "../../../../public/sites/livemarket/fonts/GmarketSansTTFBold.ttf", weight: "500" },
    { path: "../../../../public/sites/livemarket/fonts/GmarketSansTTFMedium.ttf", weight: "400" },
  ],
  variable: "--lm-font-gmarket",
  display: "swap",
});
