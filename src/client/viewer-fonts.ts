export interface ViewerFontResource {
  readonly family: string
  readonly source: string
}

declare global {
  interface Window {
    __DSH_UNIVER_VIEWER_FONTS__?: readonly ViewerFontResource[]
  }
}

/** Append registered browser fonts before React mounts a Viewer iframe. */
export function withViewerFonts(url: string): string {
  const fonts = window.__DSH_UNIVER_VIEWER_FONTS__
  if (fonts === undefined || fonts.length === 0) return url
  const target = new URL(url)
  target.searchParams.set('dshFonts', JSON.stringify(fonts))
  return target.toString()
}
