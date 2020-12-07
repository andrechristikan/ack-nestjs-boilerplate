export enum SystemSuccessStatusCode {
    // ? FORM SUCCESS
    // ! AUTH SUCCESS
    LOGIN = 1001,

    // ! USER SUCCESS
    USER_GET = 1101,
    USER_CREATE = 1102,
    USER_UPDATE = 1103,
    USER_DELETE = 1104,

    // ? GENERAL SUCCESS
    OK = 10000,
    CREATED = 10001
}

export enum SystemErrorStatusCode {
    // ? FORM ERROR
    // ! USER ERROR
    USER_NOT_FOUND = 5100,
    USER_EXIST = 5101,
    USER_MOBILE_NUMBER_EXIST = 5102,
    USER_EMAIL_EXIST = 5103,

    // ? GENERAL ERROR
    GENERAL_ERROR = 50000,
    REQUEST_ERROR = 50001,
    UNAUTHORIZED_ERROR = 50002
}

export const ResponseMessage = [
    // ? GENERAL SUCCESS
    {
        statusCode: 'OK',
        message: 'system.default'
    },
    {
        statusCode: 'CREATED',
        message: 'system.create'
    },

    // ? GENERAL ERROR
    {
        statusCode: 'GENERAL_ERROR',
        message: 'system.error.internalServerError'
    },
    {
        statusCode: 'REQUEST_ERROR',
        message: 'system.error.badRequestError'
    },
    {
        statusCode: 'UNAUTHORIZED_ERROR',
        message: 'system.error.unauthorized'
    },

    // ? FORM ERROR
    // ! AUTH SUCCESS
    {
        statusCode: 'LOGIN',
        message: 'auth.login.success'
    },

    // ! USER SUCCESS
    {
        statusCode: 'USER_GET',
        message: 'user.get.success'
    },
    {
        statusCode: 'USER_CREATE',
        message: 'user.create.success'
    },
    {
        statusCode: 'USER_UPDATE',
        message: 'user.update.success'
    },
    {
        statusCode: 'USER_DELETE',
        message: 'user.delete.success'
    },
    // ! USER ERROR
    {
        statusCode: 'USER_NOT_FOUND',
        message: 'user.error.notFound'
    },
    {
        statusCode: 'USER_EXIST',
        message: 'user.error.userExist'
    },
    {
        statusCode: 'USER_MOBILE_NUMBER_EXIST',
        message: 'user.error.mobileNumberExist'
    },
    {
        statusCode: 'USER_EMAIL_EXIST',
        message: 'user.error.emailExist'
    }
];
