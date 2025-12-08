import { ENUM_APP_STATUS_CODE_ERROR } from '@app/enums/app.status-code.enum';
import { DocDefault } from '@common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
import { ENUM_FILE_STATUS_CODE_ERROR } from '@common/file/enums/file.status-code.enum';
import { ENUM_PAGINATION_STATUS_CODE_ERROR } from '@common/pagination/enums/pagination.status-code.enum';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from '@common/request/enums/request.status-code.enum';
import { HttpStatus } from '@nestjs/common';

export const DOC_CONTENT_TYPE_MAPPING = {
    [ENUM_DOC_REQUEST_BODY_TYPE.formData]: 'multipart/form-data',
    [ENUM_DOC_REQUEST_BODY_TYPE.text]: 'text/plain',
    [ENUM_DOC_REQUEST_BODY_TYPE.json]: 'application/json',
    [ENUM_DOC_REQUEST_BODY_TYPE.formUrlencoded]: 'x-www-form-urlencoded',
} as const;

export const DOC_STANDARD_ERROR_RESPONSES = {
    INTERNAL_SERVER_ERROR: DocDefault({
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        messagePath: 'http.serverError.internalServerError',
        statusCode: ENUM_APP_STATUS_CODE_ERROR.unknown,
    }),
    REQUEST_TIMEOUT: DocDefault({
        httpStatus: HttpStatus.REQUEST_TIMEOUT,
        messagePath: 'http.serverError.requestTimeout',
        statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.timeout,
    }),
    VALIDATION_ERROR: DocDefault({
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.validation,
        messagePath: 'request.error.validation',
    }),
    PARAM_REQUIRED: DocDefault({
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.paramRequired,
        messagePath: 'request.error.paramRequired',
    }),
    ENV_FORBIDDEN: DocDefault({
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.envForbidden,
        messagePath: 'http.clientError.forbidden',
    }),
} as const;

export const DOC_PAGINATION_ERROR_RESPONSES = {
    ORDER_BY_NOT_ALLOWED: DocDefault({
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: ENUM_PAGINATION_STATUS_CODE_ERROR.orderByNotAllowed,
        messagePath: 'pagination.error.orderByNotAllowed',
    }),
    FILTER_INVALID_VALUE: DocDefault({
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: ENUM_PAGINATION_STATUS_CODE_ERROR.filterInvalidValue,
        messagePath: 'pagination.error.filterInvalidValue',
    }),
};

export const DOC_FILE_ERROR_RESPONSES = {
    REQUIRED: DocDefault({
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        messagePath: 'file.error.required',
        statusCode: ENUM_FILE_STATUS_CODE_ERROR.required,
    }),
    EXTENSION_INVALID: DocDefault({
        httpStatus: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        messagePath: 'file.error.extensionInvalid',
        statusCode: ENUM_FILE_STATUS_CODE_ERROR.extensionInvalid,
    }),
    REQUIRED_EXTRACT_FIRST: DocDefault({
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        messagePath: 'file.error.requiredParseFirst',
        statusCode: ENUM_FILE_STATUS_CODE_ERROR.requiredExtractFirst,
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
