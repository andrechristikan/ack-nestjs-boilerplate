import { ENUM_APP_STATUS_CODE_ERROR } from '@app/enums/app.status-code.enum';
import { DocDefault } from '@common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@common/doc/enums/doc.enum';
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
} as const;

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
