export function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatMegawatts(value: number) {
  return formatInteger(Math.round(value / 1000))
}
