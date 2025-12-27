import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { DocDefault } from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { HttpStatus } from '@nestjs/common';

export const DocContentTypeMapping = {
    [EnumDocRequestBodyType.formData]: 'multipart/form-data',
    [EnumDocRequestBodyType.text]: 'text/plain',
    [EnumDocRequestBodyType.json]: 'application/json',
    [EnumDocRequestBodyType.formUrlencoded]: 'x-www-form-urlencoded',
} as const;

export const DocStandardErrorResponse = {
    internalServerError: DocDefault({
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        messagePath: 'http.serverError.internalServerError',
        statusCode: EnumAppStatusCodeError.unknown,
    }),
    requestTimeout: DocDefault({
        httpStatus: HttpStatus.REQUEST_TIMEOUT,
        messagePath: 'http.serverError.requestTimeout',
        statusCode: EnumRequestStatusCodeError.timeout,
    }),
    validationError: DocDefault({
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumRequestStatusCodeError.validation,
        messagePath: 'request.error.validation',
    }),
    paramRequired: DocDefault({
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: EnumRequestStatusCodeError.paramRequired,
        messagePath: 'request.error.paramRequired',
    }),
    envForbidden: DocDefault({
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumRequestStatusCodeError.envForbidden,
        messagePath: 'http.clientError.forbidden',
    }),
} as const;

export const DocPaginationErrorResponses = {
    orderByNotAllowed: DocDefault({
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: EnumPaginationStatusCodeError.orderByNotAllowed,
        messagePath: 'pagination.error.orderByNotAllowed',
    }),
    filterInvalidValue: DocDefault({
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: EnumPaginationStatusCodeError.filterInvalidValue,
        messagePath: 'pagination.error.filterInvalidValue',
    }),
    invalidPerPage: DocDefault({
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: EnumPaginationStatusCodeError.invalidPerPage,
        messagePath: 'pagination.error.invalidPerPage',
    }),
    invalidCursorPaginationParams: DocDefault({
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: EnumPaginationStatusCodeError.invalidCursorPaginationParams,
        messagePath: 'pagination.error.invalidCursorPaginationParams',
    }),
    cursorTooLong: DocDefault({
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: EnumPaginationStatusCodeError.cursorTooLong,
        messagePath: 'pagination.error.cursorTooLong',
    }),
    invalidCursorFormat: DocDefault({
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: EnumPaginationStatusCodeError.invalidCursorFormat,
        messagePath: 'pagination.error.invalidCursorFormat',
    }),
    invalidOffsetPaginationParams: DocDefault({
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: EnumPaginationStatusCodeError.invalidOffsetPaginationParams,
        messagePath: 'pagination.error.invalidOffsetPaginationParams',
    }),
    invalidPage: DocDefault({
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: EnumPaginationStatusCodeError.invalidPage,
        messagePath: 'pagination.error.invalidPage',
    }),
    pageExceedsMaximum: DocDefault({
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: EnumPaginationStatusCodeError.pageExceedsMaximum,
        messagePath: 'pagination.error.pageExceedsMaximum',
    }),
    pageCannotBeLessThanOne: DocDefault({
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: EnumPaginationStatusCodeError.pageCannotBeLessThanOne,
        messagePath: 'pagination.error.pageCannotBeLessThanOne',
    }),
    perPageExceedsMaximum: DocDefault({
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: EnumPaginationStatusCodeError.perPageExceedsMaximum,
        messagePath: 'pagination.error.perPageExceedsMaximum',
    }),
    perPageCannotBeLessThanOne: DocDefault({
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: EnumPaginationStatusCodeError.perPageCannotBeLessThanOne,
        messagePath: 'pagination.error.perPageCannotBeLessThanOne',
    }),
    invalidCursorData: DocDefault({
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: EnumPaginationStatusCodeError.invalidCursorData,
        messagePath: 'pagination.error.invalidCursorData',
    }),
    failedToEncodeCursor: DocDefault({
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: EnumPaginationStatusCodeError.failedToEncodeCursor,
        messagePath: 'pagination.error.failedToEncodeCursor',
    }),
    failedToDecodeCursor: DocDefault({
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: EnumPaginationStatusCodeError.failedToDecodeCursor,
        messagePath: 'pagination.error.failedToDecodeCursor',
    }),
    paginationConditionsChanged: DocDefault({
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: EnumPaginationStatusCodeError.invalidCursorPaginationParams,
        messagePath: 'pagination.error.paginationConditionsChanged',
    }),
};

export const DocFileErrorResponses = {
    required: DocDefault({
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        messagePath: 'file.error.required',
        statusCode: EnumFileStatusCodeError.required,
    }),
    extensionInvalid: DocDefault({
        httpStatus: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        messagePath: 'file.error.extensionInvalid',
        statusCode: EnumFileStatusCodeError.extensionInvalid,
    }),
    requiredExtractFirst: DocDefault({
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        messagePath: 'file.error.requiredParseFirst',
        statusCode: EnumFileStatusCodeError.requiredExtractFirst,
    }),
};

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
