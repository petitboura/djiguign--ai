export function formaterHeure(dateIso: string | Date): string {
  const date = typeof dateIso === "string" ? new Date(dateIso) : dateIso;
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
