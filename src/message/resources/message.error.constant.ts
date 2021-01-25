export const AppErrorMessage = [
    //! General
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

    //! User
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
