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
import { ENUM_APP_LANGUAGE } from '@app/enums/app.enum';

/**
 * Service responsible for handling internationalization and message formatting.
 * Provides functionality for setting messages, validating language preferences,
 * and formatting validation errors with proper localization support.
 */
@Injectable()
export class MessageService implements IMessageService {
    private readonly defaultLanguage: ENUM_APP_LANGUAGE;
    private readonly availableLanguage: ENUM_APP_LANGUAGE[];
    private readonly debug: boolean;

    constructor(
        private readonly i18n: I18nService,
        private readonly configService: ConfigService
    ) {
        this.defaultLanguage =
            this.configService.get<ENUM_APP_LANGUAGE>('message.language');
        this.availableLanguage = this.configService.get<ENUM_APP_LANGUAGE[]>(
            'message.availableLanguage'
        );
        this.debug = this.configService.get<boolean>('debug.enable');
    }

    /**
     * Filters and validates if a custom language is supported by the application.
     * Returns the language if it's available, otherwise returns undefined.
     *
     * @param customLanguage - The language code to validate
     * @returns The validated language code or undefined if not supported
     */
    filterLanguage(customLanguage: string): string {
        return this.availableLanguage.find(e => e === customLanguage);
    }

    /**
     * Retrieves and formats a localized message from the i18n system.
     * Uses custom language if provided and valid, otherwise falls back to default language.
     *
     * @param path - The i18n message key path (e.g., 'error.validation.required')
     * @param options - Optional configuration including custom language and message properties
     * @returns The formatted localized message string
     */
    setMessage(path: string, options?: IMessageSetOptions): string {
        const language: string = options?.customLanguage
            ? this.filterLanguage(options.customLanguage)
            : this.defaultLanguage;

        return this.i18n.translate(path, {
            lang: language,
            args: options?.properties,
            debug: this.debug,
        });
    }

    /**
     * Converts class-validator ValidationError objects into localized message objects.
     * Handles nested validation errors and provides detailed property path information.
     *
     * @param errors - Array of ValidationError objects from class-validator
     * @param options - Optional configuration including custom language preference
     * @returns Array of formatted validation error messages with property paths
     */
    setValidationMessage(
        errors: ValidationError[],
        options?: IMessageErrorOptions
    ): IMessageValidationError[] {
        const messages: IMessageValidationError[] = [];

        for (const error of errors) {
            let property = error.property;

            const constraints: string[] = this.extractConstraints(error);

            if (constraints.length === 0) {
                const nestedResult = this.processNestedValidationError(error);
                property = nestedResult.property;
                constraints.push(...nestedResult.constraints);
            }

            for (const constraint of constraints) {
                const message = this.createValidationMessage(
                    constraint,
                    property,
                    error.value,
                    options
                );
                messages.push({
                    property,
                    message,
                });
            }
        }

        return messages;
    }

    /**
     * Formats validation import errors with localized messages for bulk operations.
     * Maps each import error to include row, sheet information, and localized error messages.
     *
     * @param errors - Array of validation import error parameters
     * @param options - Optional configuration including custom language preference
     * @returns Array of formatted validation import errors with localized messages
     */
    setValidationImportMessage(
        errors: IMessageValidationImportErrorParam[],
        options?: IMessageErrorOptions
    ): IMessageValidationImportError[] {
        return errors.map(val => ({
            row: val.row,
            sheetName: val.sheetName,
            errors: this.setValidationMessage(val.errors, options),
        }));
    }

    /**
     * Extracts constraint keys from a ValidationError object.
     *
     * @param error - The ValidationError object
     * @returns Array of constraint keys
     */
    private extractConstraints(error: ValidationError): string[] {
        return Object.keys(error.constraints ?? []);
    }

    /**
     * Processes nested validation errors by traversing child errors.
     *
     * @param error - The ValidationError object with potential children
     * @returns Object containing the full property path and constraint keys
     */
    private processNestedValidationError(error: ValidationError): {
        property: string;
        constraints: string[];
    } {
        let property = error.property;
        let children: ValidationError[] = error.children ?? [];
        let lastConstraint: Record<string, string> = {};

        while (children.length > 0) {
            const child = children[0];
            lastConstraint = child.constraints ?? {};
            property = `${property}.${child.property}`;
            children = children[0].children;
        }

        return {
            property,
            constraints: Object.keys(lastConstraint ?? []),
        };
    }

    /**
     * Creates a localized validation message for a specific constraint.
     *
     * @param constraint - The validation constraint name
     * @param property - The property path that failed validation
     * @param value - The value that failed validation
     * @param options - Optional configuration including custom language preference
     * @returns The formatted localized validation message
     */
    private createValidationMessage(
        constraint: string,
        property: string,
        value: unknown,
        options?: IMessageErrorOptions
    ): string {
        return this.setMessage(`request.${constraint}`, {
            customLanguage: options?.customLanguage,
            properties: {
                property: property.split('.').pop(),
                value: value as string | number,
            },
        });
    }
}
