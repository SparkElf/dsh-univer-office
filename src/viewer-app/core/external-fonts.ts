export const VIEWER_FONT_QUERY_PARAM = "dshFonts";

interface ViewerFontResource {
  family: string;
  source: string;
}

function readExternalFonts(): ViewerFontResource[] {
  const raw = new URLSearchParams(location.search).get(VIEWER_FONT_QUERY_PARAM);
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (
    !Array.isArray(value) ||
    !value.every(
      (font) =>
        typeof font === "object" &&
        font !== null &&
        typeof font.family === "string" &&
        typeof font.source === "string"
    )
  ) {
    throw new Error("invalid external Viewer font manifest");
  }
  return value as ViewerFontResource[];
}

/** Load external font binaries before Univer initializes and measures document text. */
export async function installExternalFontRegistration(): Promise<void> {
  const resources = readExternalFonts();
  if (resources.length === 0) return;
  const fonts = await Promise.all(
    resources.map((font) =>
      new FontFace(font.family, `url("${font.source}")`, {
        style: "normal",
        weight: "400",
      }).load()
    )
  );
  for (const font of fonts) document.fonts.add(font);
  await document.fonts.ready;
}
