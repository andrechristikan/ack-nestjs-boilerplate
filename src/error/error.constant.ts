import { HttpStatus } from '@nestjs/common';

export enum ENUM_ERROR_STATUS_CODE {
    AUTH_USER_NOT_FOUND = 5100,
    AUTH_PASSWORD_NOT_MATCH = 5101,
    AUTH_GUARD_BASIC_TOKEN_NEEDED_ERROR = 5101,
    AUTH_GUARD_BASIC_TOKEN_INVALID_ERROR = 5102,
    AUTH_GUARD_JWT_ACCESS_TOKEN_ERROR = 5103,
    AUTH_GUARD_JWT_REFRESH_TOKEN_ERROR = 5104,

    PERMISSION_GUARD_INVALID_ERROR = 5201,

    USER_NOT_FOUND_ERROR = 5301,
    USER_EXISTS_ERROR = 5302,

    HELPER_IMAGE_NEEDED_ERROR = 5800,
    HELPER_IMAGE_MAX_SIZE_ERROR = 5801,
    HELPER_IMAGE_EXTENSION_ERROR = 5802,

    UNKNOWN_ERROR = 5900,
    UNSTRUCTURED_RESPONSE_ERROR = 5901,
    REQUEST_VALIDATION_ERROR = 5902,
    TEST_ERROR = 5990,
    TEST_KAFKA_ERROR = 5991
}

export const ERROR_MESSAGE = {
    // AUTH
    AUTH_USER_NOT_FOUND: {
        httpCode: HttpStatus.NOT_FOUND,
        messagePath: 'auth.error.userNotFound'
    },
    AUTH_PASSWORD_NOT_MATCH: {
        httpCode: HttpStatus.BAD_REQUEST,
        messagePath: 'auth.error.passwordNotMatch'
    },
    AUTH_GUARD_BASIC_TOKEN_NEEDED_ERROR: {
        httpCode: HttpStatus.UNAUTHORIZED,
        messagePath: 'http.clientError.unauthorized'
    },
    AUTH_GUARD_BASIC_TOKEN_INVALID_ERROR: {
        httpCode: HttpStatus.UNAUTHORIZED,
        messagePath: 'http.clientError.unauthorized'
    },
    AUTH_GUARD_JWT_ACCESS_TOKEN_ERROR: {
        httpCode: HttpStatus.UNAUTHORIZED,
        messagePath: 'http.clientError.unauthorized'
    },
    AUTH_GUARD_JWT_REFRESH_TOKEN_ERROR: {
        httpCode: HttpStatus.UNAUTHORIZED,
        messagePath: 'http.clientError.unauthorized'
    },

    // PERMISSION
    PERMISSION_GUARD_INVALID_ERROR: {
        httpCode: HttpStatus.FORBIDDEN,
        messagePath: 'http.clientError.forbidden'
    },

    // USER
    USER_NOT_FOUND_ERROR: {
        httpCode: HttpStatus.NOT_FOUND,
        messagePath: 'user.error.notFound'
    },
    USER_EXISTS_ERROR: {
        httpCode: HttpStatus.BAD_REQUEST,
        messagePath: 'user.error.createError'
    },

    // HELPER
    HELPER_IMAGE_NEEDED_ERROR: {
        httpCode: HttpStatus.UNPROCESSABLE_ENTITY,
        messagePath: 'helper.error.imageNotFound'
    },
    HELPER_IMAGE_MAX_SIZE_ERROR: {
        httpCode: HttpStatus.PAYLOAD_TOO_LARGE,
        messagePath: 'helper.error.imageMaxSize'
    },
    HELPER_IMAGE_EXTENSION_ERROR: {
        httpCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        messagePath: 'helper.error.imageMimeInvalid'
    },

    // SYSTEM
    UNKNOWN_ERROR: {
        httpCode: HttpStatus.INTERNAL_SERVER_ERROR,
        messagePath: 'http.server.internalServerError'
    },
    UNSTRUCTURED_RESPONSE_ERROR: {
        httpCode: HttpStatus.INTERNAL_SERVER_ERROR,
        messagePath: 'response.error.errorsMustInArray'
    },
    REQUEST_VALIDATION_ERROR: {
        httpCode: HttpStatus.UNPROCESSABLE_ENTITY,
        messagePath: 'http.clientError.unprocessableEntity'
    },
    TEST_ERROR: {
        httpCode: HttpStatus.INTERNAL_SERVER_ERROR,
        messagePath: 'app.error.default'
    },
    TEST_KAFKA_ERROR: {
        httpCode: HttpStatus.INTERNAL_SERVER_ERROR,
        messagePath: 'app.error.kafka'
    }
};
