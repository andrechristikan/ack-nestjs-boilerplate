import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENUM_MESSAGE_LANGUAGE } from 'src/message/message.constant';
import {
    IMessage,
    IMessageOptions,
    IMessageSetOptions,
} from '../message.interface';
import { isArray } from 'class-validator';
import { I18nService } from 'nestjs-i18n';
import { IErrors } from 'src/utils/error/error.interface';

@Injectable()
export class MessageService {
    private readonly defaultLanguage: string;

    constructor(
        private readonly i18n: I18nService,
        private readonly configService: ConfigService
    ) {
        this.defaultLanguage = this.configService.get<string>('app.language');
    }

    async get(
        key: string,
        options?: IMessageOptions
    ): Promise<string | IMessage> {
        const { properties, appLanguages } = options;

        if (appLanguages && isArray(appLanguages) && appLanguages.length > 0) {
            const messages: IMessage = {};
            for (const appLanguage of appLanguages) {
                messages[appLanguage] = await this.setMessage(
                    appLanguage,
                    key,
                    {
                        properties,
                    }
                );
            }

            if (Object.keys(messages).length === 1) {
                return messages[appLanguages[0]];
            }

            return messages;
        }

        return this.setMessage(this.defaultLanguage, key, {
            properties,
        });
    }

    async getRequestErrorsMessage(
        requestErrors: Record<string, any>[],
        appLanguages?: string[]
    ): Promise<IErrors[]> {
        const messages: Array<IErrors[]> = [];
        for (const transfomer of requestErrors) {
            let children: Record<string, any>[] = transfomer.children || [];
            let constraints: string[] = transfomer.constraints
                ? Object.keys(transfomer.constraints)
                : [];
            const errors: IErrors[] = [];
            let property: string = transfomer.property;
            let propertyValue: string = transfomer.value;

            if (children.length > 0) {
                while (children.length > 0) {
                    for (const child of children) {
                        property = `${property}.${child.property}`;

                        if (child.constraints) {
                            constraints = Object.keys(child.constraints);
                            children = [];
                            propertyValue = child.value;
                            break;
                        }
                        if (child.children.length > 0) {
                            children = child.children;
                            break;
                        }
                    }
                }
            }

            for (const constraint of constraints) {
                errors.push({
                    property: property,
                    message: (await this.get(`request.${constraint}`, {
                        appLanguages,
                        properties: {
                            [property]: propertyValue,
                        },
                    })) as string,
                });
            }

            messages.push(errors);
        }

        return messages.flat(1) as IErrors[];
    }

    private setMessage(
        lang: string,
        key: string,
        options?: IMessageSetOptions
    ): any {
        return this.i18n.translate(key, {
            lang: lang,
            args: options && options.properties ? options : undefined,
        });
    }

    async getLanguages(): Promise<string[]> {
        return Object.values(ENUM_MESSAGE_LANGUAGE);
    }
}
