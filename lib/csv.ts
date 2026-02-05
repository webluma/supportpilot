export function toCsv(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string {
  const escape = (val: string | number | boolean | null | undefined) => {
    const safe = val === null || val === undefined ? "" : String(val);
    return `"${safe.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
  };

  const headerLine = headers.map(escape).join(",");
  const lines = rows.map((row) => row.map(escape).join(","));
  return [headerLine, ...lines].join("\n");
}
