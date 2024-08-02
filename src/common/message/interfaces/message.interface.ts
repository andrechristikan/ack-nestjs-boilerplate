import { ValidationError } from '@nestjs/common';

export type IMessageOptionsProperties = Record<string, string | number>;

export interface IMessageErrorOptions {
    readonly customLanguage?: string;
}

export interface IMessageSetOptions extends IMessageErrorOptions {
    readonly properties?: IMessageOptionsProperties;
}

export interface IMessageValidationError {
    property: string;
    message: string;
}

export interface IMessageValidationImportErrorParam {
    sheetName?: string;
    row: number;
    errors: ValidationError[];
}

export interface IMessageValidationImportError
    extends Omit<IMessageValidationImportErrorParam, 'error'> {
    errors: IMessageValidationError[];
}
