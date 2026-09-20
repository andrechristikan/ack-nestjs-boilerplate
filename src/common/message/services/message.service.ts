import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import Case from 'case';
import { I18nService } from 'nestjs-i18n';
import type {
    IMessageErrorOptions,
    IMessageSetOptions,
    IMessageValidationError,
    IMessageValidationImportError,
    IMessageValidationImportErrorParam,
} from '@common/message/interfaces/message.interface';
import { MessageValidationIssueFallbackKey } from '@common/message/constants/message.constant';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';

@Injectable()
export class MessageService {
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

    private resolveIssueKey(issue: StandardSchemaV1.Issue): string {
        const code: unknown = 'code' in issue ? issue.code : undefined;

        if (typeof code !== 'string') {
            return MessageValidationIssueFallbackKey;
        }

        return Case.camel(code);
    }

    private resolveIssueProperty(issue: StandardSchemaV1.Issue): string {
        const path = issue.path ?? [];

        if (path.length === 0) {
            return 'Unknown';
        }

        return path
            .map(segment =>
                typeof segment === 'object'
                    ? String(segment.key)
                    : String(segment)
            )
            .join('.');
    }

    private createValidationMessage(
        issue: StandardSchemaV1.Issue,
        options?: IMessageErrorOptions
    ): IMessageValidationError {
        const key = this.resolveIssueKey(issue);
        const property = this.resolveIssueProperty(issue);
        const lastProperty = property.split('.').pop() ?? 'Unknown';
        const properties: IMessageSetOptions = {
            customLanguage: options?.customLanguage,
            properties: { property: lastProperty },
        };

        const overridden = this.setMessage(issue.message, properties);
        let message: string;
        if (overridden === issue.message) {
            message = this.setMessage(`request.error.${key}`, properties);
        } else {
            message = overridden;
        }

        return {
            key,
            property,
            message,
        };
    }

    filterLanguage(customLanguage: string): string {
        return this.availableLanguage.find(e => e === customLanguage)!;
    }

    setMessage(path: string, options?: IMessageSetOptions): string {
        let language: string;
        if (options?.customLanguage) {
            language = this.filterLanguage(options.customLanguage);
        } else {
            language = this.defaultLanguage;
        }

        return this.i18n.translate(path, {
            lang: language,
            args: options?.properties,
        }) as string;
    }

    setValidationMessage(
        issues: readonly StandardSchemaV1.Issue[],
        options?: IMessageErrorOptions
    ): IMessageValidationError[] {
        return issues.map(issue =>
            this.createValidationMessage(issue, options)
        );
    }

    setValidationImportMessage(
        errors: IMessageValidationImportErrorParam[],
        options?: IMessageErrorOptions
    ): IMessageValidationImportError[] {
        return errors.map(val => {
            const errors = this.setValidationMessage(val.errors, options);

            return { row: val.row, errors };
        });
    }
}
