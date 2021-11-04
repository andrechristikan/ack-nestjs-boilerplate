import { HttpStatus } from '@nestjs/common';

export enum ENUM_STATUS_CODE_ERROR {
    TEST_ERROR = 5991,
    UNKNOWN_ERROR = 5999
}

export const ERROR_MESSAGE = {
    TEST_ERROR: {
        httpCode: HttpStatus.INTERNAL_SERVER_ERROR,
        messagePath: 'app.error.default'
    },
    UNKNOWN_ERROR: {
        httpCode: HttpStatus.INTERNAL_SERVER_ERROR,
        messagePath: 'http.server.internalServerError'
    }
};
