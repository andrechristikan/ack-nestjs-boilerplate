import { ValidationError } from '@nestjs/common';

export type IMessageProperties = Record<string, string | number>;

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
    errors: ValidationError[];
}

export interface IMessageValidationImportError extends Omit<
    IMessageValidationImportErrorParam,
    'errors'
> {
    errors: IMessageValidationError[];
}
