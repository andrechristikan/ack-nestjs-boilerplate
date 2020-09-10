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
import { LanguageService } from 'language/language.service';

export class ErrorMessage {}

@Injectable()
export class ErrorService {
    constructor(private readonly languageService: LanguageService) {}

    private setErrorMessage(statusCode: SystemErrorStatusCode): ApiError {
        switch (statusCode) {
            // ? FORM ERROR

            // ! USER
            case SystemErrorStatusCode.USER_NOT_FOUND:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get('user.error.notFound'),
                };
            case SystemErrorStatusCode.USER_MOBILE_NUMBER_EXIST:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get(
                        'user.error.mobileNumberExist',
                    ),
                };
            case SystemErrorStatusCode.USER_EMAIL_EXIST:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get('user.error.emailExist'),
                };
            case SystemErrorStatusCode.USER_EXIST:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get('user.error.userExist'),
                };

            // ! COUNTRY
            case SystemErrorStatusCode.COUNTRY_NOT_FOUND:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get('country.error.notFound'),
                };
            case SystemErrorStatusCode.COUNTRY_MOBILE_NUMBER_CODE_EXIST:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get(
                        'country.error.mobileNumberCodeExist',
                    ),
                };
            case SystemErrorStatusCode.COUNTRY_CODE_EXIST:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get(
                        'country.error.countryCode',
                    ),
                };
            case SystemErrorStatusCode.COUNTRY_EXIST:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get(
                        'country.error.countryExist',
                    ),
                };

            // ? FATAL ERROR
            case SystemErrorStatusCode.GENERAL_ERROR:
                return {
                    httpCode: HttpErrorStatusCode.INTERNAL_SERVER_ERROR,
                    message: this.languageService.get(
                        'system.error.internalServerError',
                    ),
                };
            default:
                return {
                    httpCode: HttpErrorStatusCode.INTERNAL_SERVER_ERROR,
                    message: this.languageService.get(
                        'system.error.internalServerError',
                    ),
                };
        }
    }

    private setErrorMessages(errors: ApiError[]): ApiError[] {
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

    apiError(
        statusCode: SystemErrorStatusCode,
        errors?: ApiError[],
    ): HttpException {
        const { httpCode, message }: ApiError = this.setErrorMessage(
            statusCode,
        );
        if (errors && Array.isArray(errors) && errors.length > 0) {
            errors = this.setErrorMessages(errors as ApiError[]);
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
                });
        }
    }
}
