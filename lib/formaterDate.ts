// Petit utilitaire partagé (2026-07-15, ajouté pour les mises à jour
// d'agent + Article/Réflexion/Histoire, aucun formatage de date
// n'existait encore ailleurs dans le projet à cette date).
export function formaterDate(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
