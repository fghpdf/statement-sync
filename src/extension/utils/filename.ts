export function generateStatementFilename(
  institution: string,
  accountSuffix?: string,
  date?: Date,
  includeStatementSuffix: boolean = true
): string {
  const d = date || new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  
  const suffixPart = accountSuffix ? `_${accountSuffix}` : '';
  const fileSuffix = includeStatementSuffix ? '_Statement' : '';
  
  return `${institution}${suffixPart}_${yyyy}-${mm}${fileSuffix}.csv`;
}
