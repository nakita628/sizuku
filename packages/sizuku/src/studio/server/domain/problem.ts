// RFC 9457 Problem Details, as main.tsp declares them.

export const PROBLEM_HEADERS = { "Content-Type": "application/problem+json" } as const;

export function makeValidationProblem(input: {
  readonly instance: string;
  readonly detail: string;
  readonly errors: readonly { readonly field: string; readonly message: string }[];
}) {
  return {
    type: "/problems/validation-failed" as const,
    title: "Validation Failed" as const,
    status: 422 as const,
    detail: input.detail,
    instance: input.instance,
    errors: [...input.errors],
  };
}

export function makeNotFoundProblem(input: { readonly instance: string; readonly detail: string }) {
  return {
    type: "/problems/not-found" as const,
    title: "Not Found" as const,
    status: 404 as const,
    detail: input.detail,
    instance: input.instance,
  };
}

export function makeServiceUnavailableProblem(input: {
  readonly instance: string;
  readonly detail: string;
}) {
  return {
    type: "/problems/service-unavailable" as const,
    title: "Service Unavailable" as const,
    status: 503 as const,
    detail: input.detail,
    instance: input.instance,
  };
}

export function makeInternalServerProblem(input: { readonly instance: string }) {
  return {
    type: "/problems/internal-server-error" as const,
    title: "Internal Server Error" as const,
    status: 500 as const,
    detail: "An unexpected error occurred.",
    instance: input.instance,
  };
}
