import { ValidationError } from '@nestjs/common';
import {
    IMessageErrorOptions,
    IMessageSetOptions,
    IMessageValidationError,
    IMessageValidationImportError,
    IMessageValidationImportErrorParam,
} from '@common/message/interfaces/message.interface';

/** Contract for the application's internationalization and validation message service. */
export interface IMessageService {
    /**
     * Validates that a language code is supported; returns it if valid, otherwise `undefined`.
     * @param {string} customLanguage - The language code to check (e.g. `'en'`).
     * @returns {string} The validated language code, or `undefined` if unsupported.
     */
    filterLanguage(customLanguage: string): string;

    /**
     * Resolves and returns a localized message string for the given i18n path.
     * @param {string} path - Dot-separated i18n key (e.g. `'user.error.notFound'`).
     * @param {IMessageSetOptions} [options] - Optional language override and interpolation properties.
     * @returns {string} The formatted, localized message string.
     */
    setMessage(path: string, options?: IMessageSetOptions): string;

    /**
     * Converts class-validator `ValidationError` objects into localized `IMessageValidationError` entries.
     * Handles both flat and nested validation error structures.
     * @param {ValidationError[]} errors - Raw validation errors from class-validator.
     * @param {IMessageErrorOptions} [options] - Optional language override.
     * @returns {IMessageValidationError[]} Array of localized validation error objects.
     */
    setValidationMessage(
        errors: ValidationError[],
        options?: IMessageErrorOptions
    ): IMessageValidationError[];

    /**
     * Converts per-row import validation errors into localized `IMessageValidationImportError` entries.
     * @param {IMessageValidationImportErrorParam[]} errors - Per-row raw validation error params.
     * @param {IMessageErrorOptions} [options] - Optional language override.
     * @returns {IMessageValidationImportError[]} Array of formatted, localized import errors.
     */
    setValidationImportMessage(
        errors: IMessageValidationImportErrorParam[],
        options?: IMessageErrorOptions
    ): IMessageValidationImportError[];
}
