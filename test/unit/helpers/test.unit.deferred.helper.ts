export function buildDeferred<T>(): PromiseWithResolvers<T> {
    return Promise.withResolvers<T>();
}
