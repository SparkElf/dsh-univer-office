export const VIEWER_FONT_MESSAGE_TYPE = "dsh-univer/register-fonts";

interface ViewerFontResource {
  family: string;
  source: string;
}

interface ViewerFontMessage {
  type: typeof VIEWER_FONT_MESSAGE_TYPE;
  fonts: ViewerFontResource[];
}

const loads = new Map<string, Promise<FontFace>>();

function isViewerFontMessage(value: unknown): value is ViewerFontMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Partial<ViewerFontMessage>;
  return (
    message.type === VIEWER_FONT_MESSAGE_TYPE &&
    Array.isArray(message.fonts) &&
    message.fonts.every(
      (font) => typeof font?.family === "string" && typeof font.source === "string"
    )
  );
}

function loadFont(font: ViewerFontResource): Promise<FontFace> {
  const key = font.family + "\n" + font.source;
  const current = loads.get(key);
  if (current !== undefined) return current;
  const pending = new FontFace(font.family, `url("${font.source}")`, {
    style: "normal",
    weight: "400",
  }).load();
  loads.set(key, pending);
  return pending;
}

/** Register font binaries supplied by the embedding DSH client inside this viewer document. */
export function installExternalFontRegistration(): void {
  window.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (event.source !== window.parent || !isViewerFontMessage(event.data)) return;
    void Promise.all(event.data.fonts.map(loadFont))
      .then((fonts) => {
        for (const font of fonts) document.fonts.add(font);
        window.dispatchEvent(new Event("resize"));
      })
      .catch((error) => console.error("[dsh-univer-office] external font load failed", error));
  });
}
