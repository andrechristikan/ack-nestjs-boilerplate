import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import languages, { APP_LANGUAGE } from 'src/message/message.constant';
import { IErrors } from 'src/message/message.interface';

@Injectable()
export class MessageService {
    private readonly languages: Record<string, any> = languages;

    constructor(private readonly configService: ConfigService) {}

    get(key: string): string {
        // Env Variable
        const defaultMessage =
            this.configService.get('app.language') || APP_LANGUAGE;

        const keys: string[] = key.split('.');
        let selectedMessage: Record<string, any> | string = this.languages[
            defaultMessage
        ];

        for (const i of keys) {
            selectedMessage = selectedMessage[i];

            if (!selectedMessage) {
                selectedMessage = key;
                break;
            }
        }

        return selectedMessage as string;
    }

    getRequestErrorsMessage(requestErrors: Record<string, any>[]): IErrors[] {
        const messageErrors: IErrors[] = requestErrors.map((value) => {
            for (const i in value.constraints) {
                return {
                    property: value.property,
                    message: this.get(`request.${value.constraints[i]}`)
                        .replace('$property', value.property)
                        .replace('$value', value.value)
                };
            }
        });
        return messageErrors;
    }
}
