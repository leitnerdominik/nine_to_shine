export function getPlayerInitials(displayName: string): string {
  const nameParts = displayName.trim().split(/\s+/).filter(Boolean);

  if (nameParts.length > 1) {
    return nameParts
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toLocaleUpperCase('de-DE');
  }

  return nameParts[0]?.slice(0, 2).toLocaleUpperCase('de-DE') ?? '?';
}
