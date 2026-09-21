/**
 * Application-level error status codes for request-layer failures.
 * @public
 */
export enum EnumRequestStatusCodeError {
    validation = 50300,
    timeout = 50301,
    envForbidden = 50302,
    schemaMissing = 50303,
    contextMissing = 50304,
}
