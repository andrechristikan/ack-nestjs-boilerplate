import { ValidationError } from '@nestjs/common';

/** Key-value map used for i18n message interpolation (e.g. `{ name: 'John', count: 5 }`). */
export type IMessageProperties = Record<string, string | number>;

/** Options for resolving a message in a specific language. */
export interface IMessageErrorOptions {
    /** Override the language used to resolve the message. Falls back to default if unsupported. */
    readonly customLanguage?: string;
}

/** Options for resolving and formatting a message with optional interpolation properties. */
export interface IMessageSetOptions extends IMessageErrorOptions {
    /** Interpolation values injected into the i18n message template. */
    readonly properties?: IMessageProperties;
}

/** A single localized validation error entry returned to the client. */
export interface IMessageValidationError {
    /** The class-validator constraint key (e.g. `isNotEmpty`, `isEmail`). */
    key: string;
    /** Dot-separated property path that failed validation (e.g. `user.email`). */
    property: string;
    /** Localized error message string. */
    message: string;
}

/** Raw input containing a row index and raw class-validator errors for import validation. */
export interface IMessageValidationImportErrorParam {
    /** 1-based row number in the imported file. */
    row: number;
    /** Raw class-validator errors for this row. */
    errors: ValidationError[];
}

/** Formatted import validation error with localized messages, ready to return to the client. */
export interface IMessageValidationImportError extends Omit<
    IMessageValidationImportErrorParam,
    'errors'
> {
    /** Localized validation errors for this row. */
    errors: IMessageValidationError[];
}
