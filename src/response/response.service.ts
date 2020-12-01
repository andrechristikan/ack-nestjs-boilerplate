import { Injectable } from '@nestjs/common';
import {
    SystemSuccessStatusCode,
    SystemErrorStatusCode,
    ResponseMessage
} from 'response/response.constant';
import { 
    IApiMessage, 
    IApiErrors, 
    IApiErrorMessage, 
    IApiErrorResponse, 
    IApiSuccessResponse ,
    IApiRawMessage
} from 'response/response.interface'; 
import { LanguageService } from 'language/language.service';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'middleware/logger/logger.decorator';
import { Language } from 'language/language.decorator';
import { Config } from 'config/config.decorator';
import { ConfigService } from 'config/config.service';

@Injectable()
export class ResponseService {
    constructor(
        @Logger() private readonly logger: LoggerService,
        @Language() private readonly languageService: LanguageService,
        @Config() private readonly configService: ConfigService
    ) {}

    private setMessage(statusCode: SystemErrorStatusCode | SystemSuccessStatusCode): IApiMessage {
        
        const message: IApiRawMessage[] = ResponseMessage.filter( (val) => {
            const statusCodeMerge: Record<string, any> = {
                ...SystemErrorStatusCode,
                ...SystemSuccessStatusCode
            }
            return val.statusCode === statusCodeMerge[statusCode];
        });
        return {
            statusCode: statusCode,
            message: this.languageService.get(
                message[0].message
            )
        };
    }

    setErrorMessage(errors: IApiErrors[]): IApiErrorMessage[] {
        const newError: IApiErrorMessage[] = [];
        errors.forEach((value: IApiErrors) => {
            const error: IApiMessage = this.setMessage(value.statusCode);
            newError.push({
                property: value.property,
                message: error.message
            });
        });
        return newError;
    }

    error(
        statusCode: SystemErrorStatusCode, 
        errors?: IApiErrorMessage[]
    ): IApiErrorResponse {
        const message: IApiMessage = this.setMessage(statusCode);
        const response: IApiErrorResponse = {
            statusCode,
            message: message.message,
            errors
        };

        if(this.configService.getEnv("APP_DEBUG")){
            this.logger.error('Error', response);
        }
        return response;
    }

    success(
        statusCode: SystemSuccessStatusCode, 
        data?: Record<string, any> | Record<string, any>[]
    ): IApiSuccessResponse{
        const message: IApiMessage = this.setMessage(statusCode);
        const response: IApiSuccessResponse = {
            statusCode,
            message: message.message,
            data
        };

        if(this.configService.getEnv("APP_DEBUG")){
            this.logger.info('Success', response);
        }
        return response;
    }

    raw(response: Record<string, any>): Record<string, any>{
        if(this.configService.getEnv("APP_DEBUG")){
            this.logger.info('Raw', response);
        }

        return response;
    }
    

    // setRequestErrorMessage(errors: Record<string, any>[]): IApiError {
    //     const responseApiError: Record<string, any>[] = [];
    //     if (this.configService.getEnv('APP_DEBUG')) {
    //         console.log('errors', errors);
    //     }
    //     for (const i of errors) {
    //         for (const [j, k] of Object.entries(i.constraints)) {
    //             responseApiError.push({
    //                 property: i.property,
    //                 message: this.languageService
    //                     .get(`request.${j}`)
    //                     .replace('$property', i.property)
    //                     .replace('$value', i.value)
    //             });
    //         }
    //     }
    //     return {
    //         statusCode: SystemErrorStatusCode.REQUEST_ERROR,
    //         httpCode: HttpErrorStatusCode.BAD_REQUEST,
    //         message: this.languageService.get('request.default'),
    //         errors: responseApiError
    //     };
    // }
}
