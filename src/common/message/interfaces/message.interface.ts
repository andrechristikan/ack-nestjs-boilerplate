import type { StandardSchemaV1 } from '@standard-schema/spec';

export type IMessageProperties = Record<
    string,
    string | number | boolean | Date
>;

export interface IMessageErrorOptions {
    readonly customLanguage?: string;
}

export interface IMessageSetOptions extends IMessageErrorOptions {
    readonly properties?: IMessageProperties;
}

export interface IMessageValidationError {
    key: string;
    property: string;
    message: string;
}

export interface IMessageValidationImportErrorParam {
    row: number;
    errors: readonly StandardSchemaV1.Issue[];
}

export interface IMessageValidationImportError extends Omit<
    IMessageValidationImportErrorParam,
    'errors'
> {
    errors: IMessageValidationError[];
}
