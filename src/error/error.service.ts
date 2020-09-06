import {
    Injectable,
    BadRequestException,
    HttpException,
    InternalServerErrorException,
} from '@nestjs/common';
import {
    HttpErrorStatusCode,
    SystemErrorStatusCode,
} from 'error/error.constant';

export class ErrorMessage {
    static setErrorMessage(
        statusCode: SystemErrorStatusCode,
    ): Record<string, any> {
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
            // ? SYSTEM ERROR

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

    static setErrorMessages(
        errors: Array<Record<string, any>>,
    ): Array<Record<string, any>> {
        const newError: Array<Record<string, any>> = [];
        errors.forEach((value: Record<string, any>) => {
            const error: Record<string, any> = this.setErrorMessage(
                value.statusCode,
            );
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
        errors?: Array<Record<string, any>>,
    ): HttpException {
        const {
            httpCode,
            message,
        }: Record<string, any> = ErrorMessage.setErrorMessage(statusCode);
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
