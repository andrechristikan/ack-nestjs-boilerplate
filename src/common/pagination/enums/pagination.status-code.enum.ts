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
    invalidOffsetPaginationParams = 50205,
    invalidPage = 50206,
    pageExceedsMaximum = 50207,
    pageCannotBeLessThanOne = 50208,
    perPageExceedsMaximum = 50209,
    perPageCannotBeLessThanOne = 50210,
    invalidCursorData = 50211,
    failedToEncodeCursor = 50212,
    failedToDecodeCursor = 50213,
}
