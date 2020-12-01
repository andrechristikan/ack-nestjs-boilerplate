export enum SystemSuccessStatusCode {
    OK = 2000,
    CREATED = 2001
}

export enum SystemErrorStatusCode {
    // ? FORM ERROR

    // ! USER
    USER_NOT_FOUND = 3100,
    USER_EXIST = 3101,
    USER_MOBILE_NUMBER_EXIST = 3102,
    USER_EMAIL_EXIST = 3103,

    // ? FATAL ERROR
    GENERAL_ERROR = 10000,
    REQUEST_ERROR = 10001,
    UNAUTHORIZED_ERROR = 10002
}


export const ResponseMessage = [
    {
        statusCode: 'OK',
        message: 'system.default'
    },
    {
        statusCode: 'CREATED',
        message: 'system.create'
    },
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

    // User
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
    },
    
]