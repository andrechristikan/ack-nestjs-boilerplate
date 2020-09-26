import { Injectable, Scope } from '@nestjs/common';
import {
    HttpErrorStatusCode,
    SystemErrorStatusCode
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
        @Language() private readonly languageService: LanguageService
    ) {}

    private setErrorMessage(statusCode: SystemErrorStatusCode): IApiError {
        switch (statusCode) {
            // ? FORM ERROR

            // ! USER
            case SystemErrorStatusCode.USER_NOT_FOUND:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get('user.error.notFound')
                };
            case SystemErrorStatusCode.USER_MOBILE_NUMBER_EXIST:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get(
                        'user.error.mobileNumberExist'
                    )
                };
            case SystemErrorStatusCode.USER_EMAIL_EXIST:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get('user.error.emailExist')
                };
            case SystemErrorStatusCode.USER_EXIST:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get('user.error.userExist')
                };

            // ! COUNTRY
            case SystemErrorStatusCode.COUNTRY_NOT_FOUND:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get('country.error.notFound')
                };
            case SystemErrorStatusCode.COUNTRY_MOBILE_NUMBER_CODE_EXIST:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get(
                        'country.error.mobileNumberCodeExist'
                    )
                };
            case SystemErrorStatusCode.COUNTRY_CODE_EXIST:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get(
                        'country.error.countryCode'
                    )
                };
            case SystemErrorStatusCode.COUNTRY_EXIST:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get(
                        'country.error.countryExist'
                    )
                };

            case SystemErrorStatusCode.COUNTRY_MOBILE_NUMBER_CODE_LENGTH:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get(
                        'country.error.mobileNumberCodeLength'
                    )
                };
            case SystemErrorStatusCode.COUNTRY_CODE_LENGTH:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get(
                        'country.error.countryCodeLength'
                    )
                };
            case SystemErrorStatusCode.COUNTRY_MOBILE_NUMBER_CODE_STRING:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get(
                        'country.error.mobileNumberCodeString'
                    )
                };
            case SystemErrorStatusCode.COUNTRY_CODE_STRING:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get(
                        'country.error.countryCodeString'
                    )
                };
            case SystemErrorStatusCode.COUNTRY_NAME_STRING:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get(
                        'country.error.countryNameString'
                    )
                };

            // ? HTTP ERROR
            case SystemErrorStatusCode.GENERAL_ERROR:
                return {
                    httpCode: HttpErrorStatusCode.INTERNAL_SERVER_ERROR,
                    message: this.languageService.get(
                        'system.error.internalServerError'
                    )
                };
            case SystemErrorStatusCode.REQUEST_ERROR:
                return {
                    httpCode: HttpErrorStatusCode.BAD_REQUEST,
                    message: this.languageService.get(
                        'system.error.badRequestError'
                    )
                };

            default:
                return {
                    httpCode: HttpErrorStatusCode.INTERNAL_SERVER_ERROR,
                    message: this.languageService.get(
                        'system.error.internalServerError'
                    )
                };
        }
    }

    private setErrorMessages(errors: IApiError[]): IApiError[] {
        const newError: IApiError[] = [];
        errors.forEach((value: IApiError) => {
            const error: IApiError = this.setErrorMessage(value.statusCode);
            newError.push({
                property: value.property,
                message: error.message
            });
        });
        return newError;
    }

    setError(
        statusCode: SystemErrorStatusCode,
        errors?: IApiError[]
    ): IApiError {
        const { httpCode, message }: IApiError = this.setErrorMessage(
            statusCode
        );
        if (errors && Array.isArray(errors) && errors.length > 0) {
            errors = this.setErrorMessages(errors as IApiError[]);
        }

        switch (httpCode) {
            case 400:
                return {
                    statusCode,
                    httpCode,
                    message,
                    errors
                };
            default:
                this.logger.error({
                    statusCode,
                    httpCode,
                    message
                });
                return {
                    statusCode,
                    httpCode,
                    message
                };
        }
    }

    requestApiError(errors: Record<string, any>): IApiError {
        const responseApiError: Record<string, any>[] = [];
        for (const i of errors.details) {
            responseApiError.push({
                property: i.path[0],
                message: i.message
            });
        }
        return {
            statusCode: SystemErrorStatusCode.REQUEST_ERROR,
            httpCode: HttpErrorStatusCode.BAD_REQUEST,
            message: this.languageService.get('request.default'),
            errors: responseApiError
        };
    }

    // details: [
    //     {
    //       message: 'mobileNumberCode cannot be an empty field',
    //       path: [Array],
    //       type: 'string.empty',
    //       context: [Object]
    //     },
    //     {
    //       message: 'countryCode cannot be an empty field',
    //       path: [Array],
    //       type: 'string.empty',
    //       context: [Object]
    //     },
    //     {
    //       message: 'countryName should be a type of string',
    //       path: [Array],
    //       type: 'string.base',
    //       context: [Object]
    //     }
    //   ]
    // }
}
