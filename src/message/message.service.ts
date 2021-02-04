import { Injectable } from '@nestjs/common';
import { Language } from 'language/language.decorator';
import { LanguageService } from 'language/language.service';
import { AppErrorStatusCode } from 'status-code/status-code.error.constant';
import { AppSuccessStatusCode } from 'status-code/status-code.success.constant';
import { AppSuccessMessage } from 'message/resources/message.success.constant';
import { AppErrorMessage } from 'message/resources/message.error.constant';
import { IMessage, IRawMessage } from 'message/message.interface';
import { IErrors, IMessageErrors } from 'message/message.interface';

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

        const AppMessageMerge: IRawMessage[] = [
            ...AppSuccessMessage,
            ...AppErrorMessage
        ];

        const message: IRawMessage[] = AppMessageMerge.filter((val) => {
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
            for (const [i, k] of Object.entries(value.constraints)) {
                return {
                    property: value.property,
                    message: this.languageService
                        .get(`request.${i}`)
                        .replace('$property', value.property)
                        .replace('$value', value.value)
                };
            }
        });
        return errors;
    }
}
