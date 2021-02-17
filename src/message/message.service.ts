import { Injectable } from '@nestjs/common';
import { Language } from 'src/language/language.decorator';
import { LanguageService } from 'src/language/language.service';
import { AppErrorStatusCode } from 'src/status-code/status-code.error.constant';
import { AppSuccessStatusCode } from 'src/status-code/status-code.success.constant';
import { AppSuccessMessage } from 'src/message/resources/message.success.constant';
import { AppErrorMessage } from 'src/message/resources/message.error.constant';
import { IMessage, IMessageRaw } from 'src/message/message.interface';
import { IErrors, IMessageErrors } from 'src/message/message.interface';

@Injectable()
export class MessageService {
    constructor(
        @Language() private readonly languageService: LanguageService
    ) {}

    set(statusCode: AppSuccessStatusCode | AppErrorStatusCode): IMessage {
        const AppStatusCodeMerge: Record<string, any> = {
            ...AppSuccessStatusCode,
            ...AppErrorStatusCode
        };

        const AppMessageMerge: IMessageRaw[] = [
            ...AppSuccessMessage,
            ...AppErrorMessage
        ];

        const message: IMessageRaw[] = AppMessageMerge.filter((val) => {
            return val.statusCode === AppStatusCodeMerge[statusCode];
        });
        return {
            statusCode: statusCode,
            message: this.languageService.get(message[0].message)
        };
    }

    setErrors(errors: IErrors[]): IMessageErrors[] {
        const newError: IMessageErrors[] = [];

        for (const error of errors) {
            const newMessage: IMessage = this.set(error.statusCode);
            newError.push({
                property: error.property,
                message: newMessage.message
            });
        }
        return newError;
    }

    setRequestErrorMessage(rawErrors: Record<string, any>[]): IMessageErrors[] {
        const errors: IMessageErrors[] = rawErrors.map((value) => {
            for (const i in value.constraints) {
                return {
                    property: value.property,
                    message: this.languageService
                        .get(`request.${value.constraints[i]}`)
                        .replace('$property', value.property)
                        .replace('$value', value.value)
                };
            }
        });
        return errors;
    }
}
