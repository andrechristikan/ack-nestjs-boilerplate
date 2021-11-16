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
        const messageErrors: Record<string, any>[] = requestErrors.map(
            (value: Record<string, any>) => {
                let children: Record<string, any>[] = value.children || [];
                let constraints: string[] = value.constraints
                    ? Object.keys(value.constraints)
                    : [];
                let property: string = value.property;
                let val: string = value.value;

                if (children.length > 0) {
                    while (children.length > 0) {
                        for (const child of children) {
                            property = `${property}.${child.property}`;

                            if (child.constraints) {
                                constraints = Object.keys(child.constraints);
                                children = [];
                                val = child.value;
                                break;
                            }
                            if (child.children.length > 0) {
                                children = child.children;
                                break;
                            }
                        }
                    }
                }

                return constraints.map((l) => ({
                    property: property,
                    message: this.get(`request.${l}`)
                        .replace('$property', property)
                        .replace('$value', val)
                }));
            }
        );
        return messageErrors.flat(1) as IErrors[];
    }
}
