import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IErrors } from 'src/error/error.interface';
import messages, { ENUM_MESSAGE_LANGUAGE } from 'src/message/message.constant';
import {
    IMessage,
    IMessageOptions,
    IMessageSetOptions,
} from './message.interface';
import dot from 'dot-object';
import { isArray } from 'class-validator';

@Injectable()
export class MessageService {
    private readonly messages: Record<string, any> = messages;
    private readonly defaultLanguage: string;

    constructor(private readonly configService: ConfigService) {
        this.defaultLanguage = this.configService.get<string>('app.language');
    }

    get(key: string, options?: IMessageOptions): string | IMessage[] {
        const { property, appLanguages, propertyValue } = options;
        const defaultMessage = `${this.defaultLanguage}.${key}`;
        const languages: Record<string, any>[] = appLanguages
            ? appLanguages
                  .filter((value) =>
                      ENUM_MESSAGE_LANGUAGE[value] ? true : false
                  )
                  .map((value) => ({
                      path: `${value.toLowerCase()}.${key}`,
                      language: value,
                  }))
            : [];

        let messages: string | Record<string, any>[] =
            languages.length == 0 ? defaultMessage : languages;

        if (
            typeof messages === 'string' ||
            (isArray(messages) && messages.length === 1)
        ) {
            if (isArray(messages)) {
                messages = defaultMessage;
            }
            return this.setMessage(messages as string, {
                property,
                propertyValue,
            });
        }

        return messages.map((value) => {
            const message: string = this.setMessage(value.path, {
                property,
                propertyValue,
            });
            return {
                language: value.language,
                message,
            };
        });
    }

    getRequestErrorsMessage(
        requestErrors: Record<string, any>[],
        appLanguages?: string[]
    ): IErrors[] {
        const messageErrors: Record<string, any>[] = requestErrors.map(
            (transfomer: Record<string, any>) => {
                let children: Record<string, any>[] = transfomer.children || [];
                let constraints: string[] = transfomer.constraints
                    ? Object.keys(transfomer.constraints)
                    : [];
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

                return constraints.map((value) => ({
                    property: property,
                    message: this.get(`request.${value}`, {
                        appLanguages,
                        property,
                        propertyValue,
                    }),
                }));
            }
        );
        return messageErrors.flat(1) as IErrors[];
    }

    private setMessage(key: string, options?: IMessageSetOptions): string {
        const lastMessage: string = dot.pick(key, this.messages) || key;
        return lastMessage
            .replace('$property', options.property)
            .replace('$value', options.propertyValue);
    }

    async getLanguages(): Promise<string[]> {
        return Object.values(ENUM_MESSAGE_LANGUAGE);
    }
}
