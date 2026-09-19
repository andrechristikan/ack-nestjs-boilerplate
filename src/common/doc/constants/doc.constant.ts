import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { DocResponseError } from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { HttpStatus } from '@nestjs/common';

/**
 * Maps request body types to MIME strings. `none` is excluded on purpose so `DocRequest`
 * skips `ApiConsumes` instead of emitting an invalid MIME type.
 * @public
 */
export const DocContentTypeMapping = {
    [EnumDocRequestBodyType.formData]: 'multipart/form-data',
    [EnumDocRequestBodyType.text]: 'text/plain',
    [EnumDocRequestBodyType.json]: 'application/json',
    [EnumDocRequestBodyType.formUrlencoded]: 'x-www-form-urlencoded',
} as const;

/**
 * Metadata key the doc primitives accumulate their documented response entries under, on the
 * decorated method. Deliberately not `swagger/apiResponse`: the entries stored here are
 * un-assembled records, not assembled `ApiResponse` entries.
 * @public
 */
export const DocResponseEntryMetaKey = 'DocResponseEntryMetaKey';

/**
 * Error responses every documented endpoint can return: server error, timeout, validation,
 * environment forbidden and rate limit.
 * @public
 */
export const DocGlobalErrorResponses = {
    internalServerError: DocResponseError(HttpStatus.INTERNAL_SERVER_ERROR, {
        messagePath: 'http.serverError.internalServerError',
        statusCode: EnumAppStatusCodeError.unknown,
    }),
    requestTimeout: DocResponseError(HttpStatus.REQUEST_TIMEOUT, {
        messagePath: 'http.serverError.requestTimeout',
        statusCode: EnumRequestStatusCodeError.timeout,
    }),
    validationError: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        statusCode: EnumRequestStatusCodeError.validation,
        messagePath: 'request.error.validation',
    }),
    envForbidden: DocResponseError(HttpStatus.FORBIDDEN, {
        statusCode: EnumRequestStatusCodeError.envForbidden,
        messagePath: 'http.clientError.forbidden',
    }),
    tooManyRequests: DocResponseError(HttpStatus.TOO_MANY_REQUESTS, {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        messagePath: 'http.429',
    }),
} as const;

/**
 * Pagination error responses every offset and cursor list endpoint can return.
 * @public
 */
export const DocPaginationErrorResponses = {
    orderByNotAllowed: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        statusCode: EnumPaginationStatusCodeError.orderByNotAllowed,
        messagePath: 'pagination.error.orderByNotAllowed',
    }),
    orderDirectionNotAllowed: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        statusCode: EnumPaginationStatusCodeError.orderDirectionNotAllowed,
        messagePath: 'pagination.error.orderDirectionNotAllowed',
    }),
    filterInvalidValue: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        statusCode: EnumPaginationStatusCodeError.filterInvalidValue,
        messagePath: 'pagination.error.filterInvalidValue',
    }),
    invalidPerPage: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        statusCode: EnumPaginationStatusCodeError.invalidPerPage,
        messagePath: 'pagination.error.invalidPerPage',
    }),
    perPageExceedsMaximum: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        statusCode: EnumPaginationStatusCodeError.perPageExceedsMaximum,
        messagePath: 'pagination.error.perPageExceedsMaximum',
    }),
    perPageCannotBeLessThanOne: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        statusCode: EnumPaginationStatusCodeError.perPageCannotBeLessThanOne,
        messagePath: 'pagination.error.perPageCannotBeLessThanOne',
    }),
};

/**
 * Pagination error responses specific to cursor list endpoints.
 * @public
 */
export const DocPaginationCursorErrorResponses = {
    invalidCursorPaginationParams: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        statusCode: EnumPaginationStatusCodeError.invalidCursorPaginationParams,
        messagePath: 'pagination.error.invalidCursorPaginationParams',
    }),
    cursorTooLong: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        statusCode: EnumPaginationStatusCodeError.cursorTooLong,
        messagePath: 'pagination.error.cursorTooLong',
    }),
    invalidCursorFormat: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        statusCode: EnumPaginationStatusCodeError.invalidCursorFormat,
        messagePath: 'pagination.error.invalidCursorFormat',
    }),
    invalidCursorData: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        statusCode: EnumPaginationStatusCodeError.invalidCursorData,
        messagePath: 'pagination.error.invalidCursorData',
    }),
    failedToEncodeCursor: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        statusCode: EnumPaginationStatusCodeError.failedToEncodeCursor,
        messagePath: 'pagination.error.failedToEncodeCursor',
    }),
    failedToDecodeCursor: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        statusCode: EnumPaginationStatusCodeError.failedToDecodeCursor,
        messagePath: 'pagination.error.failedToDecodeCursor',
    }),
    paginationConditionsChanged: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        statusCode: EnumPaginationStatusCodeError.invalidCursorPaginationParams,
        messagePath: 'pagination.error.paginationConditionsChanged',
    }),
};

/**
 * Pagination error responses specific to offset list endpoints.
 * @public
 */
export const DocPaginationOffsetErrorResponses = {
    invalidOffsetPaginationParams: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        statusCode: EnumPaginationStatusCodeError.invalidOffsetPaginationParams,
        messagePath: 'pagination.error.invalidOffsetPaginationParams',
    }),
    invalidPage: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        statusCode: EnumPaginationStatusCodeError.invalidPage,
        messagePath: 'pagination.error.invalidPage',
    }),
    pageExceedsMaximum: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        statusCode: EnumPaginationStatusCodeError.pageExceedsMaximum,
        messagePath: 'pagination.error.pageExceedsMaximum',
    }),
    pageCannotBeLessThanOne: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        statusCode: EnumPaginationStatusCodeError.pageCannotBeLessThanOne,
        messagePath: 'pagination.error.pageCannotBeLessThanOne',
    }),
};

/**
 * File upload and export error responses for documented file endpoints.
 * @public
 */
export const DocFileErrorResponses = {
    required: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        messagePath: 'file.error.required',
        statusCode: EnumFileStatusCodeError.required,
    }),
    extensionInvalid: DocResponseError(HttpStatus.UNSUPPORTED_MEDIA_TYPE, {
        messagePath: 'file.error.extensionInvalid',
        statusCode: EnumFileStatusCodeError.extensionInvalid,
    }),
    requiredExtractFirst: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        messagePath: 'file.error.requiredExtractFirst',
        statusCode: EnumFileStatusCodeError.requiredExtractFirst,
    }),
    exceedMaxDataExport: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        messagePath: 'file.error.exceedMaxDataExport',
        statusCode: EnumFileStatusCodeError.exceedMaxDataExport,
    }),
    exceedMaxSizeExport: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        messagePath: 'file.error.exceedMaxSizeExport',
        statusCode: EnumFileStatusCodeError.exceedMaxSizeExport,
    }),
    exceedMaxSizeUpload: DocResponseError(HttpStatus.PAYLOAD_TOO_LARGE, {
        messagePath: 'file.error.exceedMaxSizeUpload',
        statusCode: EnumFileStatusCodeError.exceedMaxSizeUpload,
    }),
    exceedMaxFiles: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        messagePath: 'file.error.exceedMaxFiles',
        statusCode: EnumFileStatusCodeError.exceedMaxFiles,
    }),
    fieldUnexpected: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        messagePath: 'file.error.fieldUnexpected',
        statusCode: EnumFileStatusCodeError.fieldUnexpected,
    }),
    multipartInvalid: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        messagePath: 'file.error.multipartInvalid',
        statusCode: EnumFileStatusCodeError.multipartInvalid,
    }),
};

/**
 * Swagger query parameters of an offset list endpoint: `perPage` and `page`.
 * @public
 */
export const DocPaginationOffsetQueries = [
    {
        name: 'perPage',
        required: false,
        allowEmptyValue: true,
        example: 20,
        type: 'number',
        description: 'Data per page, max 100',
    },
    {
        name: 'page',
        required: false,
        allowEmptyValue: true,
        example: 1,
        type: 'number',
        description: 'page number, max 20',
    },
];

/**
 * Swagger query parameters of a cursor list endpoint: `perPage` and `cursor`.
 * @public
 */
export const DocPaginationCursorQueries = [
    {
        name: 'perPage',
        required: false,
        allowEmptyValue: true,
        example: 20,
        type: 'number',
        description: 'Data per page, max 100',
    },
    {
        name: 'cursor',
        required: false,
        allowEmptyValue: true,
        example: 'eyJpZCI6IjE2In0=',
        type: 'string',
        description: 'The pagination cursor returned from the previous request',
    },
];
