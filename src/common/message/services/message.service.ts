import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ValidationError } from 'class-validator';
import { I18nService } from 'nestjs-i18n';
import {
    IErrors,
    IErrorsImport,
    IValidationErrorImport,
} from 'src/common/error/interfaces/error.interface';
import { HelperArrayService } from 'src/common/helper/services/helper.array.service';
import {
    IMessageErrorOptions,
    IMessageOptions,
    IMessageSetOptions,
} from 'src/common/message/interfaces/message.interface';
import { IMessageService } from 'src/common/message/interfaces/message.service.interface';

@Injectable()
export class MessageService implements IMessageService {
    private readonly appDefaultLanguage: string;
    private readonly appDefaultAvailableLanguage: string[];

    constructor(
        private readonly i18n: I18nService,
        private readonly configService: ConfigService,
        private readonly helperArrayService: HelperArrayService
    ) {
        this.appDefaultLanguage =
            this.configService.get<string>('message.language');
        this.appDefaultAvailableLanguage = this.configService.get<string[]>(
            'message.availableLanguage'
        );
    }

    getAvailableLanguages(): string[] {
        return this.appDefaultAvailableLanguage;
    }

    getLanguage(): string {
        return this.appDefaultLanguage;
    }

    filterLanguage(customLanguages: string[]): string[] {
        return this.helperArrayService.intersection(
            customLanguages,
            this.appDefaultAvailableLanguage
        );
    }

    setMessage(
        lang: string,
        key: string,
        options?: IMessageSetOptions
    ): string {
        return this.i18n.translate(key, {
            lang: lang,
            args: options?.properties,
        }) as any;
    }

    getRequestErrorsMessage(
        requestErrors: ValidationError[],
        options?: IMessageErrorOptions
    ): IErrors[] {
        const messages: Array<IErrors[]> = [];
        for (const requestError of requestErrors) {
            let children: Record<string, any>[] = requestError.children;
            let constraints: string[] = Object.keys(
                requestError.constraints ?? []
            );
            let property: string = requestError.property;
            let propertyValue: string = requestError.value;

            while (children?.length > 0) {
                property = `${property}.${children[0].property}`;

                if (children[0].children?.length > 0) {
                    children = children[0].children;
                } else {
                    constraints = Object.keys(children[0].constraints);
                    propertyValue = children[0].value;
                    children = [];
                }
            }

            const errors: IErrors[] = [];
            for (const constraint of constraints) {
                errors.push({
                    property,
                    message: this.get(`request.${constraint}`, {
                        customLanguages: options?.customLanguages,
                        properties: {
                            property,
                            value: propertyValue,
                        },
                    }),
                });
            }

            messages.push(errors);
        }

        return messages.flat(1) as IErrors[];
    }

    getImportErrorsMessage(
        errors: IValidationErrorImport[],
        options?: IMessageErrorOptions
    ): IErrorsImport[] {
        return errors.map((val) => ({
            row: val.row,
            file: val.file,
            sheet: val.sheet,
            errors: this.getRequestErrorsMessage(val.errors, options),
        }));
    }

    get<T = string>(key: string, options?: IMessageOptions): T {
        const customLanguages =
            options?.customLanguages?.length > 0
                ? this.filterLanguage(options.customLanguages)
                : [this.appDefaultLanguage];

        if (customLanguages.length > 1) {
            return customLanguages.reduce(
                (a, v) => ({
                    ...a,
                    [v]: this.setMessage(v, key, {
                        properties: options?.properties,
                    }),
                }),
                {}
            ) as any;
        }

        return this.setMessage(customLanguages[0], key, {
            properties: options?.properties,
        }) as any;
    }
}
