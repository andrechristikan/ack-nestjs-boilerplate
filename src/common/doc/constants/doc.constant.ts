import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { DocDefault } from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { HttpStatus } from '@nestjs/common';

export const DOC_CONTENT_TYPE_MAPPING = {
    [EnumDocRequestBodyType.formData]: 'multipart/form-data',
    [EnumDocRequestBodyType.text]: 'text/plain',
    [EnumDocRequestBodyType.json]: 'application/json',
    [EnumDocRequestBodyType.formUrlencoded]: 'x-www-form-urlencoded',
} as const;

export const DOC_STANDARD_ERROR_RESPONSES = {
    INTERNAL_SERVER_ERROR: DocDefault({
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        messagePath: 'http.serverError.internalServerError',
        statusCode: EnumAppStatusCodeError.unknown,
    }),
    REQUEST_TIMEOUT: DocDefault({
        httpStatus: HttpStatus.REQUEST_TIMEOUT,
        messagePath: 'http.serverError.requestTimeout',
        statusCode: EnumRequestStatusCodeError.timeout,
    }),
    VALIDATION_ERROR: DocDefault({
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumRequestStatusCodeError.validation,
        messagePath: 'request.error.validation',
    }),
    PARAM_REQUIRED: DocDefault({
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: EnumRequestStatusCodeError.paramRequired,
        messagePath: 'request.error.paramRequired',
    }),
    ENV_FORBIDDEN: DocDefault({
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumRequestStatusCodeError.envForbidden,
        messagePath: 'http.clientError.forbidden',
    }),
} as const;

export const DOC_PAGINATION_ERROR_RESPONSES = {
    ORDER_BY_NOT_ALLOWED: DocDefault({
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumPaginationStatusCodeError.orderByNotAllowed,
        messagePath: 'pagination.error.orderByNotAllowed',
    }),
    FILTER_INVALID_VALUE: DocDefault({
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: EnumPaginationStatusCodeError.filterInvalidValue,
        messagePath: 'pagination.error.filterInvalidValue',
    }),
};

export const DOC_FILE_ERROR_RESPONSES = {
    REQUIRED: DocDefault({
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        messagePath: 'file.error.required',
        statusCode: EnumFileStatusCodeError.required,
    }),
    EXTENSION_INVALID: DocDefault({
        httpStatus: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        messagePath: 'file.error.extensionInvalid',
        statusCode: EnumFileStatusCodeError.extensionInvalid,
    }),
    REQUIRED_EXTRACT_FIRST: DocDefault({
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        messagePath: 'file.error.requiredParseFirst',
        statusCode: EnumFileStatusCodeError.requiredExtractFirst,
    }),
};

export const DOC_PAGINATION_OFFSET_QUERIES = [
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

export const DOC_PAGINATION_CURSOR_QUERIES = [
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
