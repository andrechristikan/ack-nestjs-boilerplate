import {
    Injectable,
    BadRequestException,
    HttpException,
    InternalServerErrorException,
    Scope,
} from '@nestjs/common';
import {
    HttpErrorStatusCode,
    SystemErrorStatusCode,
} from 'error/error.constant';
import { IApiError } from 'error/error.interface';
import { LanguageService } from 'language/language.service';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'logger/logger.decorator';
import { Language } from 'language/language.decorator';

export class ErrorMessage {}

@Injectable({ scope: Scope.TRANSIENT })
export class ErrorService {
    constructor(
        @Logger() private readonly logger: LoggerService,
        @Language() private readonly languageService: LanguageService,
    ) {}

    private setErrorMessage(statusCode: SystemErrorStatusCode): IApiError {
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

    private setErrorMessages(errors: IApiError[]): IApiError[] {
        const newError: IApiError[] = [];
        errors.forEach((value: IApiError) => {
            const error: IApiError = this.setErrorMessage(value.statusCode);
            newError.push({
                ...value,
                message: error.message,
            });
        });
        return newError;
    }

    apiError(
        statusCode: SystemErrorStatusCode,
        errors?: IApiError[],
    ): HttpException {
        let res: HttpException;
        const { httpCode, message }: IApiError = this.setErrorMessage(
            statusCode,
        );
        if (errors && Array.isArray(errors) && errors.length > 0) {
            errors = this.setErrorMessages(errors as IApiError[]);
        }

        switch (httpCode) {
            case 400:
                res = new BadRequestException({
                    statusCode,
                    httpCode,
                    message,
                    errors,
                });
                break;
            default:
                res = new InternalServerErrorException({
                    statusCode,
                    httpCode,
                    message,
                });
                break;
        }

        this.logger.error(res);
        return res;
    }
}
