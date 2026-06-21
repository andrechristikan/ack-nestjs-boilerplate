import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ValidationError } from 'class-validator';
import { I18nService } from 'nestjs-i18n';
import {
    IMessageErrorOptions,
    IMessageSetOptions,
    IMessageValidationError,
    IMessageValidationImportError,
    IMessageValidationImportErrorParam,
} from '@common/message/interfaces/message.interface';
import { IMessageService } from '@common/message/interfaces/message.service.interface';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';

@Injectable()
export class MessageService implements IMessageService {
    private readonly defaultLanguage: EnumMessageLanguage;
    private readonly availableLanguage: EnumMessageLanguage[];

    constructor(
        private readonly i18n: I18nService,
        private readonly configService: ConfigService
    ) {
        this.defaultLanguage =
            this.configService.get<EnumMessageLanguage>('message.language')!;
        this.availableLanguage = this.configService.get<EnumMessageLanguage[]>(
            'message.availableLanguage'
        )!;
    }

    filterLanguage(customLanguage: string): string {
        return this.availableLanguage.find(e => e === customLanguage)!;
    }

    setMessage(path: string, options?: IMessageSetOptions): string {
        const language: string = options?.customLanguage
            ? this.filterLanguage(options.customLanguage)
            : this.defaultLanguage;

        return this.i18n.translate(path, {
            lang: language,
            args: options?.properties,
        }) as string;
    }

    setValidationMessage(
        errors: ValidationError[],
        options?: IMessageErrorOptions
    ): IMessageValidationError[] {
        const messages: IMessageValidationError[] = [];

        for (const error of errors) {
            let property = error.property;
            let constraints: Record<string, string> = error.constraints!;
            let constraintKeys = constraints ? Object.keys(constraints) : [];

            if (constraintKeys.length === 0) {
                const nestedResult = this.processNestedValidationError(error);
                property = nestedResult.property;
                constraints = nestedResult.constraints;
                constraintKeys = Object.keys(nestedResult.constraints);
            }

            for (const constraintKey of constraintKeys) {
                messages.push(
                    this.createValidationMessage(
                        constraintKey,
                        constraints[constraintKey],
                        error.value,
                        property,
                        options
                    )
                );
            }
        }

        return messages;
    }

    setValidationImportMessage(
        errors: IMessageValidationImportErrorParam[],
        options?: IMessageErrorOptions
    ): IMessageValidationImportError[] {
        return errors.map(val => ({
            row: val.row,
            errors: this.setValidationMessage(val.errors, options),
        }));
    }

    private processNestedValidationError(error: ValidationError): {
        property: string;
        constraints: Record<string, string>;
    } {
        let property = error.property;
        let children: ValidationError[] = error.children ?? [];
        let lastConstraint: Record<string, string> = {};

        while (children.length > 0) {
            const child = children[0];
            lastConstraint = child.constraints ?? {};
            property = `${property}.${child.property}`;
            children = children[0].children ?? [];
        }

        return {
            property,
            constraints: lastConstraint,
        };
    }

    private createValidationMessage(
        constraint: string,
        rawMessage: string,
        value: unknown,
        property?: string,
        options?: IMessageErrorOptions
    ): IMessageValidationError {
        const messagePath = `request.error.${constraint}`;
        property = property ?? 'Unknown';
        const lastProperty = property?.split('.')?.pop() ?? 'Unknown';

        let message: string = this.setMessage(`request.error.${constraint}`, {
            customLanguage: options?.customLanguage,
            properties: {
                property: lastProperty,
                value: value as string | number,
            },
        });

        if (message === messagePath) {
            message = this.setMessage(rawMessage, {
                customLanguage: options?.customLanguage,
                properties: {
                    property: lastProperty,
                    value: value as string | number,
                },
            });
        }

        return {
            key: constraint,
            property,
            message,
        };
    }
}
