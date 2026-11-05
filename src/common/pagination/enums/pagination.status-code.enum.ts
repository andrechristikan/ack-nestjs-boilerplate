/**
 * Status codes raised by the `pagination` kit.
 * @public
 */
export enum EnumPaginationStatusCodeError {
    filterInvalidValue = 50200,
    invalidPerPage = 50201,
    invalidCursorPaginationParams = 50202,
    cursorTooLong = 50203,
    invalidCursorFormat = 50204,
    invalidPage = 50205,
    pageExceedsMaximum = 50206,
    pageCannotBeLessThanOne = 50207,
    perPageExceedsMaximum = 50208,
    perPageCannotBeLessThanOne = 50209,
    invalidCursorData = 50210,
    failedToDecodeCursor = 50211,
}
