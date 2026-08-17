/** Machine-facing Univer page for Slide layout analysis and SVG text measurement. */
import '@univer/render-preset/styles'
import '@univer/render-preset/facades'

import { LocaleType, Univer } from '@univerjs/core'
import { TEST_LICENSE, ViewAssetIoOwner, registerViewRendering } from '@univer/render-preset'
import { CONTENT_EN_US } from '@univer/render-preset/machine-locale'
import {
  UnitRegistry,
  type RenderEmbeddedUnitSourceWire,
  type RenderFormulaReferenceUnitSourceWire,
  type RenderUnitTypeWire,
} from './units.js'
import { measureText, type MeasureTextResult } from './measure.js'
import { captureSlideLayout, type SlideLayoutCaptureResult } from './slide-ops.js'

const univer = new Univer({
  locale: LocaleType.EN_US,
  locales: { [LocaleType.EN_US]: CONTENT_EN_US },
})

registerViewRendering(univer, {
  container: 'app',
  assetIoOwner: ViewAssetIoOwner.Local,
  license: TEST_LICENSE,
  workbenchChrome: 'visible',
})

const registry = new UnitRegistry(univer)

interface RenderRuntimePageApi {
  readonly ready: true
  loadUnit(input: {
    readonly unitKey: string
    readonly unitType: RenderUnitTypeWire
    readonly unitData: Record<string, unknown>
    readonly formulaReferenceUnits?: readonly RenderFormulaReferenceUnitSourceWire[]
    readonly embeddedUnits?: readonly RenderEmbeddedUnitSourceWire[]
  }): Promise<{ readonly unitKey: string; readonly loaded: true }>
  measureText(input: {
    readonly doc: Record<string, unknown>
    readonly wrapWidth?: number
  }): Promise<MeasureTextResult>
  captureSlideLayout(input: {
    readonly unitKey: string
    readonly pages?: readonly number[]
  }): Promise<SlideLayoutCaptureResult>
}

declare global {
  interface Window {
    __univerRenderRuntime: RenderRuntimePageApi
  }
}

window.__univerRenderRuntime = {
  ready: true,
  loadUnit: (input) => registry.load(input),
  measureText: async (input) => measureText(univer, input),
  captureSlideLayout: (input) =>
    captureSlideLayout(univer, registry.require(input.unitKey), input.pages),
}
