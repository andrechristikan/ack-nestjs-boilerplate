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

/**
 * Service responsible for handling internationalization and message formatting.
 * Provides functionality for setting messages, validating language preferences,
 * and formatting validation errors with proper localization support.
 */
@Injectable()
export class MessageService implements IMessageService {
    private readonly defaultLanguage: EnumMessageLanguage;
    private readonly availableLanguage: EnumMessageLanguage[];

    constructor(
        private readonly i18n: I18nService,
        private readonly configService: ConfigService
    ) {
        this.defaultLanguage =
            this.configService.get<EnumMessageLanguage>('message.language');
        this.availableLanguage = this.configService.get<EnumMessageLanguage[]>(
            'message.availableLanguage'
        );
    }

    /**
     * Filters and validates if a custom language is supported by the application.
     * Returns the language if it's available, otherwise returns undefined.
     * @param {string} customLanguage - The language code to validate
     * @returns {string} The validated language code or undefined if not supported
     */
    filterLanguage(customLanguage: string): string {
        return this.availableLanguage.find(e => e === customLanguage);
    }

    /**
     * Retrieves and formats a localized message from the i18n system.
     * Uses custom language if provided and valid, otherwise falls back to default language.
     * @param {string} path - The i18n message key path (e.g., 'error.validation.required')
     * @param {IMessageSetOptions} [options] - Optional configuration including custom language and message properties
     * @returns {string} The formatted localized message string
     */
    setMessage(path: string, options?: IMessageSetOptions): string {
        const language: string = options?.customLanguage
            ? this.filterLanguage(options.customLanguage)
            : this.defaultLanguage;

        return this.i18n.translate(path, {
            lang: language,
            args: options?.properties,
        });
    }

    /**
     * Converts an array of class-validator ValidationError objects into an array of localized validation message objects.
     * Handles both flat and nested validation errors, providing detailed property path information for each error.
     *
     * @param errors - Array of ValidationError objects from class-validator
     * @param options - (Optional) Configuration for custom language and message properties
     * @returns Array of IMessageValidationError objects, each containing the constraint key, property path, and localized message
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
                messages.push(
                    this.createValidationMessage(
                        constraint,
                        error.constraints[constraint],
                        error.value,
                        property,
                        options
                    )
                );
            }
        }

        return messages;
    }

    /**
     * Formats validation import errors with localized messages for bulk operations.
     * Maps each import error to include row, and localized error messages.
     * @param {IMessageValidationImportErrorParam[]} errors - Array of validation import error parameters
     * @param {IMessageErrorOptions} [options] - Optional configuration including custom language preference
     * @returns {IMessageValidationImportError[]} Array of formatted validation import errors with localized messages
     */
    setValidationImportMessage(
        errors: IMessageValidationImportErrorParam[],
        options?: IMessageErrorOptions
    ): IMessageValidationImportError[] {
        return errors.map(val => ({
            row: val.row,
            errors: this.setValidationMessage(val.errors, options),
        }));
    }

    /**
     * Extracts constraint keys from a ValidationError object.
     * @param error - The ValidationError object
     * @returns Array of constraint keys
     */
    private extractConstraints(error: ValidationError): string[] {
        return Object.keys(error.constraints ?? []);
    }

    /**
     * Processes nested validation errors by traversing child errors.
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
     * Creates a single localized validation message object for a specific validation constraint.
     * Constructs a validation error message by combining the constraint key, failed value, property path,
     * and a localized message string from the i18n system. If the i18n translation for the constraint is not found,
     * it falls back to the raw message provided by class-validator.
     *
     * @param constraint - The validation constraint key (e.g., 'isNotEmpty', 'isEmail', 'minLength')
     * @param rawMessage - The raw message string from class-validator constraints
     * @param value - The value that failed validation (any type)
     * @param property - (Optional) The full property path that failed validation (e.g., 'user.email', 'profile.name')
     * @param options - (Optional) Configuration for custom language and message properties
     * @returns IMessageValidationError object containing the constraint key, property path, and localized message
     */
    private createValidationMessage(
        constraint: string,
        rawMessage: string,
        value: unknown,
        property?: string,
        options?: IMessageErrorOptions
    ): IMessageValidationError {
        const messagePath = `request.error.${constraint}`;
        const lastProperty = property?.split('.')?.pop() ?? 'Unknown';
        let message = this.setMessage(`request.error.${constraint}`, {
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
