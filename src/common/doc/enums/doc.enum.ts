/**
 * Supported request body content types for Swagger documentation.
 *
 * `none` indicates the endpoint has no request body. It does not map to a MIME type
 * and causes `DocRequest` to skip the `ApiConsumes` decorator entirely.
 */
export enum EnumDocRequestBodyType {
    json = 'json',
    formData = 'formData',
    formUrlencoded = 'formUrlencoded',
    text = 'text',
    none = 'none',
}
