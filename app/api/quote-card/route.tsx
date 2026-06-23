import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getTheme } from "@/lib/themes";

export const runtime = "nodejs";

const FONT_DIR = (pkg: string) =>
  path.join(process.cwd(), "node_modules", "@fontsource", pkg, "files");

async function loadFonts() {
  const [playfair, oswald] = await Promise.all([
    readFile(path.join(FONT_DIR("playfair-display"), "playfair-display-latin-ext-400-italic.woff")),
    readFile(path.join(FONT_DIR("oswald"), "oswald-latin-ext-500-normal.woff")),
  ]);
  return [
    { name: "Playfair", data: playfair, style: "italic" as const, weight: 400 as const },
    { name: "Oswald", data: oswald, style: "normal" as const, weight: 500 as const },
  ];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("highlightId");
  const themeKey = searchParams.get("theme");
  const download = searchParams.get("download");

  if (!id) return new Response("highlightId gerekli", { status: 400 });

  const highlight = await prisma.highlight.findUnique({
    where: { id },
    include: { article: { include: { publisher: true } } },
  });
  if (!highlight) return new Response("Bulunamadı", { status: 404 });

  const theme = getTheme(themeKey ?? highlight.article.posterTheme);
  const fonts = await loadFonts();
  const date = new Date(highlight.article.publishedAt)
    .toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
    .toLocaleUpperCase("tr");

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1080px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "96px",
          background: `linear-gradient(150deg, ${theme.bgFrom}, ${theme.bgTo})`,
          color: theme.text,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Oswald", fontSize: 30, letterSpacing: 4, color: theme.accent }}>
          <span>TUHAF CLUB</span>
          <span style={{ color: theme.text, opacity: 0.7 }}>{date}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ width: 90, height: 6, background: theme.accent, marginBottom: 48 }} />
          <div style={{ display: "flex", fontFamily: "Playfair", fontStyle: "italic", fontSize: 76, lineHeight: 1.18 }}>
            {`“${highlight.text}”`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", fontFamily: "Oswald", letterSpacing: 3 }}>
          <div style={{ width: "100%", height: 1, background: theme.text, opacity: 0.25, marginBottom: 28 }} />
          <span style={{ fontSize: 34 }}>{highlight.article.title.toLocaleUpperCase("tr")}</span>
          <span style={{ fontSize: 26, opacity: 0.65, marginTop: 6 }}>
            {highlight.article.publisher.name.toLocaleUpperCase("tr")}
          </span>
        </div>
      </div>
    ),
    { width: 1080, height: 1080, fonts },
  );

  if (download) {
    return new Response(image.body, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'attachment; filename="tuhaf-alinti.png"',
      },
    });
  }
  return image;
}
