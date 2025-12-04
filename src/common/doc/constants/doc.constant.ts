import { ENUM_APP_STATUS_CODE_ERROR } from '@app/enums/app.status-code.enum';
import { DocDefault } from '@common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
import { ENUM_FILE_STATUS_CODE_ERROR } from '@common/file/enums/file.status-code.enum';
import { ENUM_PAGINATION_STATUS_CODE_ERROR } from '@common/pagination/enums/pagination.status-code.enum';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from '@common/request/enums/request.status-code.enum';
import { HttpStatus } from '@nestjs/common';

export const DOC_CONTENT_TYPE_MAPPING = {
    [ENUM_DOC_REQUEST_BODY_TYPE.FORM_DATA]: 'multipart/form-data',
    [ENUM_DOC_REQUEST_BODY_TYPE.TEXT]: 'text/plain',
    [ENUM_DOC_REQUEST_BODY_TYPE.JSON]: 'application/json',
    [ENUM_DOC_REQUEST_BODY_TYPE.FORM_URLENCODED]: 'x-www-form-urlencoded',
} as const;

export const DOC_STANDARD_ERROR_RESPONSES = {
    INTERNAL_SERVER_ERROR: DocDefault({
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        messagePath: 'http.serverError.internalServerError',
        statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
    }),
    REQUEST_TIMEOUT: DocDefault({
        httpStatus: HttpStatus.REQUEST_TIMEOUT,
        messagePath: 'http.serverError.requestTimeout',
        statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.TIMEOUT,
    }),
    VALIDATION_ERROR: DocDefault({
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.VALIDATION,
        messagePath: 'request.error.validation',
    }),
    PARAM_REQUIRED: DocDefault({
        httpStatus: HttpStatus.BAD_REQUEST,
        statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.PARAM_REQUIRED,
        messagePath: 'request.error.paramRequired',
    }),
    ENV_FORBIDDEN: DocDefault({
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.ENV_FORBIDDEN,
        messagePath: 'http.clientError.forbidden',
    }),
} as const;

export const DOC_PAGINATION_ERROR_RESPONSES = {
    ORDER_BY_NOT_ALLOWED: DocDefault({
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: ENUM_PAGINATION_STATUS_CODE_ERROR.ORDER_BY_NOT_ALLOWED,
        messagePath: 'pagination.error.orderByNotAllowed',
    }),
    FILTER_INVALID_VALUE: DocDefault({
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        statusCode: ENUM_PAGINATION_STATUS_CODE_ERROR.FILTER_INVALID_VALUE,
        messagePath: 'pagination.error.filterInvalidValue',
    }),
};

export const DOC_FILE_ERROR_RESPONSES = {
    REQUIRED: DocDefault({
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        messagePath: 'file.error.required',
        statusCode: ENUM_FILE_STATUS_CODE_ERROR.REQUIRED,
    }),
    EXTENSION_INVALID: DocDefault({
        httpStatus: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        messagePath: 'file.error.extensionInvalid',
        statusCode: ENUM_FILE_STATUS_CODE_ERROR.EXTENSION_INVALID,
    }),
    REQUIRED_EXTRACT_FIRST: DocDefault({
        httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        messagePath: 'file.error.requiredParseFirst',
        statusCode: ENUM_FILE_STATUS_CODE_ERROR.REQUIRED_EXTRACT_FIRST,
    }),
};

export const DOC_PAGINATION_QUERIES = [
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
