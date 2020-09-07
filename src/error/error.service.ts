import {
    Injectable,
    BadRequestException,
    HttpException,
    InternalServerErrorException,
} from '@nestjs/common';
import {
    HttpErrorStatusCode,
    SystemErrorStatusCode,
    ApiError,
} from 'error/error.constant';

export class ErrorMessage {
    static setErrorMessage(statusCode: SystemErrorStatusCode): ApiError {
        switch (statusCode) {
            // ? FORM ERROR

            // ! USER
            case SystemErrorStatusCode.USER_NOT_FOUND:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: 'User not found',
                };
            case SystemErrorStatusCode.USER_MOBILE_NUMBER_EXIST:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: 'Mobile number used',
                };
            case SystemErrorStatusCode.USER_EMAIL_EXIST:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: 'Email used',
                };
            case SystemErrorStatusCode.USER_EXIST:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: 'User existed',
                };

            // ! COUNTRY
            case SystemErrorStatusCode.COUNTRY_NOT_FOUND:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: 'Country not found',
                };
            case SystemErrorStatusCode.COUNTRY_MOBILE_NUMBER_CODE_EXIST:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: 'Country mobile number code used',
                };
            case SystemErrorStatusCode.COUNTRY_CODE_EXIST:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: 'Country code used',
                };
            case SystemErrorStatusCode.COUNTRY_EXIST:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: 'Country existed',
                };

            // ? FATAL ERROR
            case SystemErrorStatusCode.GENERAL_ERROR:
                return {
                    httpCode: HttpErrorStatusCode.INTERNAL_SERVER_ERROR,
                    message: 'Internal Server Error',
                };
            default:
                return {
                    httpCode: HttpErrorStatusCode.INTERNAL_SERVER_ERROR,
                    message: 'Internal Server Error',
                };
        }
    }

    static setErrorMessages(errors: ApiError[]): ApiError[] {
        const newError: ApiError[] = [];
        errors.forEach((value: ApiError) => {
            const error: ApiError = this.setErrorMessage(value.statusCode);
            newError.push({
                ...value,
                message: error.message,
            });
        });
        return newError;
    }
}

@Injectable()
export class ErrorService {
    apiError(
        statusCode: SystemErrorStatusCode,
        errors?: ApiError[],
    ): HttpException {
        const { httpCode, message }: ApiError = ErrorMessage.setErrorMessage(
            statusCode,
        );
        if (errors && errors.length > 0) {
            errors = ErrorMessage.setErrorMessages(errors);
        }

        switch (httpCode) {
            case 400:
                return new BadRequestException({
                    statusCode,
                    httpCode,
                    message,
                    errors,
                });
            default:
                return new InternalServerErrorException({
                    statusCode,
                    httpCode,
                    message,
                    errors,
                });
        }
    }
}
