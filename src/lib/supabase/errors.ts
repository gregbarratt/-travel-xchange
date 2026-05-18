export function isMissingTableError(
  error: { code?: string; message?: string },
  tableNames: string[],
) {
  const message = error.message?.toLowerCase() ?? "";
  const mentionsKnownTable = tableNames.some((tableName) =>
    message.includes(tableName.toLowerCase()),
  );

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (mentionsKnownTable &&
      (message.includes("could not find") ||
        message.includes("does not exist") ||
        message.includes("schema cache")))
  );
}
