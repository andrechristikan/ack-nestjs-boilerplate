/**
 * Request body content types for Swagger. `none` means no body: it maps to no MIME type
 * and makes `DocRequest` skip `ApiConsumes`.
 */
export enum EnumDocRequestBodyType {
    json = 'json',
    formData = 'formData',
    formUrlencoded = 'formUrlencoded',
    text = 'text',
    none = 'none',
}
