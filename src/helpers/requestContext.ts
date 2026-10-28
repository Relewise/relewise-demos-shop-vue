export type RequestContextValues = Record<string, string>;

/**
 * Adds per-request context values to a request built by the Relewise SDK.
 *
 * The API supports contextValues, but @relewise/client 2.27.0 does not expose
 * the property on its request types or builders yet.
 */
export function withContextValues<TRequest extends object>(
    request: TRequest,
    contextValues: RequestContextValues,
): TRequest & { contextValues: RequestContextValues } {
    return {
        ...request,
        contextValues,
    };
}
