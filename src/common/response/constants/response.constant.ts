/**
 * Metadata key used to store and retrieve the i18n message path on a route handler.
 * Set by the `@Response` and `@ResponsePaging` decorators via `SetMetadata`,
 * and read by `ResponseInterceptor` and `ResponsePagingInterceptor` to resolve
 * the localized response message.
 */
export const ResponseMessagePathMetaKey = 'ResponseMessagePathMetaKey';
