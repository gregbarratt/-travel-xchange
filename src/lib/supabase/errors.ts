export function isMissingTableError(
  error: { code?: string; message?: string },
  tableNames: string[],
) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    tableNames.some((tableName) => message.includes(tableName.toLowerCase()))
  );
}
