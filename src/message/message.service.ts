import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IErrors } from 'src/error/error.interface';
import languages from 'src/message/message.constant';

@Injectable()
export class MessageService {
    private readonly languages: Record<string, any> = languages;
    private readonly language: string;

    constructor(private readonly configService: ConfigService) {
        this.language = this.configService.get<string>('app.language');
    }

    get(key: string): string {
        const keys: string[] = key.split('.');
        let selectedMessage: Record<string, any> | string = this.languages[
            this.language
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
        const messageErrors: IErrors[] = requestErrors.map(
            (value: Record<string, any>) => {
                if (value.children && value.children.length > 0) {
                    return value.children.map((val: Record<string, any>) => ({
                        property: `${value.property}.${val.property}`,
                        message: this.get(`request.${val.constraints[0]}`)
                            .replace('$property', val.property)
                            .replace('$value', val.val)
                    }));
                } else {
                    return {
                        property: value.property,
                        message: this.get(`request.${value.constraints[0]}`)
                            .replace('$property', value.property)
                            .replace('$value', value.value)
                    };
                }
            }
        );
        return messageErrors.flat(1);
    }
}
