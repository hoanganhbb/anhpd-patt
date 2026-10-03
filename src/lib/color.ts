// Translucent version of a hex colour, e.g. for tinted backgrounds and borders.
export const alpha = (color: string, opacity: number) =>
  `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent)`
