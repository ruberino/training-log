export function normalizeName(name: string): string {
  return name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}
