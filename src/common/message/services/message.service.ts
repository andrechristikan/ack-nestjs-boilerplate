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
     * Converts class-validator ValidationError objects into localized message objects.
     * Handles nested validation errors and provides detailed property path information.
     * @param {ValidationError[]} errors - Array of ValidationError objects from class-validator
     * @param {IMessageErrorOptions} [options] - Optional configuration including custom language preference
     * @returns {IMessageValidationError[]} Array of formatted validation error messages with property paths
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
     * Maps each import error to include row, sheet information, and localized error messages.
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
            sheetName: val.sheetName,
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
     * Creates a localized validation message object for a specific validation constraint.
     * This method constructs a complete validation error message by combining the constraint name,
     * failed value, property path, and localized message text from the i18n system.
     * @param constraint - The validation constraint identifier (e.g., 'isNotEmpty', 'isEmail', 'minLength')
     * @param value - The actual value that failed validation, can be of any type
     * @param property - The full property path that failed validation (e.g., 'user.email', 'profile.name')
     * @param options - Optional configuration object containing custom language preferences
     * @returns A structured validation error object containing the constraint key, property path, and localized message
     */
    private createValidationMessage(
        constraint: string,
        value: unknown,
        property?: string,
        options?: IMessageErrorOptions
    ): IMessageValidationError {
        const message = this.setMessage(`request.error.${constraint}`, {
            customLanguage: options?.customLanguage,
            properties: {
                property: property?.split('.').pop(),
                value: value as string | number,
            },
        });

        return {
            key: constraint,
            property: property ?? 'Unknown',
            message,
        };
    }
}
