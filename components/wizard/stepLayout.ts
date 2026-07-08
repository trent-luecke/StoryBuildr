// Shared layout classes for wizard step content.
//
// The card is centered within the white content area by <main> (flex
// justify-center). Its width is PIECEWISE:
//   • at/below ~1400px viewport → fixed 640px, so it slides left/right as the
//     window resizes (keeps its size, position tracks the center of the white
//     space) instead of shrinking in place.
//   • above ~1400px → grows (~0.45px per px of extra width) up to a 900px cap,
//     so on a large/full-screen monitor it fills more space instead of looking
//     marooned in empty slate.
// max-w-full keeps it from overflowing on very narrow windows.
const CENTER =
  'w-[clamp(640px,calc(640px_+_(100vw_-_1400px)_*_0.45),900px)] max-w-full my-10'

// Input form steps: centered column wrapped in a card surface.
export const STEP_CARD = `${CENTER} rounded-2xl border border-gray-200 bg-white shadow-md p-8`

// Content/results steps that render their own nested cards: same column, no
// outer card surface (avoids card-in-card).
export const STEP_COLUMN = `${CENTER} px-8`
