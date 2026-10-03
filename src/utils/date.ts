/**
 * Heutiges Datum als `YYYY-MM-DD` in der Ortszeit - der Wert, den ein
 * `<input type="date">` erwartet. `toISOString()` rechnet in UTC und lieferte
 * zwischen Mitternacht und 1/2 Uhr (MEZ/MESZ) noch das gestrige Datum.
 */
export function todayLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
