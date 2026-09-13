import "server-only";

type LogContext = Readonly<Record<string, string | number | boolean | null>>;

function errorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      ...(process.env.NODE_ENV !== "production" && error.stack
        ? { errorStack: error.stack }
        : {}),
    };
  }

  return { errorName: "UnknownError", errorMessage: String(error) };
}

export function logServerError(
  event: string,
  error: unknown,
  context: LogContext = {},
) {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      event,
      ...context,
      ...errorDetails(error),
    }),
  );
}
