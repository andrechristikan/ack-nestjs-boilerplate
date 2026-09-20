import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import { DocResponseError } from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { EnumHelperStatusCodeError } from '@common/helper/enums/helper.status-code.enum';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { EnumResponseStatusCodeError } from '@common/response/enums/response.status-code.enum';
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
 * rate limit, the helper failures, a missing request schema, a missing request context, a
 * failed unique-value generation and an unavailable AWS service.
 * @public
 */
export const DocGlobalErrorResponses = {
    internalServerError: DocResponseError(HttpStatus.INTERNAL_SERVER_ERROR, {
        messagePath: 'http.serverError.internalServerError',
        statusCode: EnumAppStatusCodeError.unknown,
    }),
    requestTimeout: DocResponseError(HttpStatus.REQUEST_TIMEOUT, {
        messagePath: 'http.clientError.requestTimeOut',
        statusCode: EnumRequestStatusCodeError.timeout,
    }),
    validationError: DocResponseError(HttpStatus.UNPROCESSABLE_ENTITY, {
        statusCode: EnumRequestStatusCodeError.validation,
        messagePath: 'request.error.validation',
    }),
    tooManyRequests: DocResponseError(HttpStatus.TOO_MANY_REQUESTS, {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        messagePath: 'http.429',
    }),
    decryptFailed: DocResponseError(HttpStatus.INTERNAL_SERVER_ERROR, {
        statusCode: EnumHelperStatusCodeError.decryptFailed,
        messagePath: 'helper.error.decryptFailed',
    }),
    encryptionSecretInvalid: DocResponseError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
            statusCode: EnumHelperStatusCodeError.encryptionSecretInvalid,
            messagePath: 'helper.error.encryptionSecretInvalid',
        }
    ),
    patternTokenMissing: DocResponseError(HttpStatus.INTERNAL_SERVER_ERROR, {
        statusCode: EnumHelperStatusCodeError.patternTokenMissing,
        messagePath: 'helper.error.patternTokenMissing',
    }),
    schemaMissing: DocResponseError(HttpStatus.INTERNAL_SERVER_ERROR, {
        statusCode: EnumRequestStatusCodeError.schemaMissing,
        messagePath: 'request.error.schemaMissing',
    }),
    contextMissing: DocResponseError(HttpStatus.INTERNAL_SERVER_ERROR, {
        statusCode: EnumRequestStatusCodeError.contextMissing,
        messagePath: 'request.error.contextMissing',
    }),
    uniqueValueGenerationFailed: DocResponseError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
            statusCode: EnumDatabaseStatusCodeError.uniqueValueGenerationFailed,
            messagePath: 'database.error.uniqueValueGenerationFailed',
        }
    ),
    serviceUnavailable: DocResponseError(HttpStatus.SERVICE_UNAVAILABLE, {
        statusCode: EnumAwsStatusCodeError.serviceUnavailable,
        messagePath: 'aws.error.serviceUnavailable',
    }),
} as const;

/**
 * Response-layer error responses raised while serializing a response: the serialization failure
 * every JSON endpoint can return, and the two pagination-shape failures only a paginated one can.
 * @public
 */
export const DocSerializationErrorResponses = {
    serialization: DocResponseError(HttpStatus.INTERNAL_SERVER_ERROR, {
        statusCode: EnumResponseStatusCodeError.serialization,
        messagePath: 'response.error.serialization',
    }),
    paginationShapeInvalid: DocResponseError(HttpStatus.INTERNAL_SERVER_ERROR, {
        statusCode: EnumResponseStatusCodeError.paginationShapeInvalid,
        messagePath: 'response.error.paginationShapeInvalid',
    }),
    paginationTypeInvalid: DocResponseError(HttpStatus.INTERNAL_SERVER_ERROR, {
        statusCode: EnumResponseStatusCodeError.paginationTypeInvalid,
        messagePath: 'response.error.paginationTypeInvalid',
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
    orderDirectionNotAllowed: DocResponseError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        {
            statusCode: EnumPaginationStatusCodeError.orderDirectionNotAllowed,
            messagePath: 'pagination.error.orderDirectionNotAllowed',
        }
    ),
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
    perPageCannotBeLessThanOne: DocResponseError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        {
            statusCode:
                EnumPaginationStatusCodeError.perPageCannotBeLessThanOne,
            messagePath: 'pagination.error.perPageCannotBeLessThanOne',
        }
    ),
};

/**
 * Pagination error responses specific to cursor list endpoints.
 * @public
 */
export const DocPaginationCursorErrorResponses = {
    invalidCursorPaginationParams: DocResponseError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        {
            statusCode:
                EnumPaginationStatusCodeError.invalidCursorPaginationParams,
            messagePath: 'pagination.error.invalidCursorPaginationParams',
        }
    ),
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
};

/**
 * Pagination error responses specific to offset list endpoints.
 * @public
 */
export const DocPaginationOffsetErrorResponses = {
    invalidOffsetPaginationParams: DocResponseError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        {
            statusCode:
                EnumPaginationStatusCodeError.invalidOffsetPaginationParams,
            messagePath: 'pagination.error.invalidOffsetPaginationParams',
        }
    ),
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
