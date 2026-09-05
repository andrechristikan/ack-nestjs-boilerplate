import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
    IMessageErrorOptions,
    IMessageSetOptions,
    IMessageValidationError,
    IMessageValidationImportError,
    IMessageValidationImportErrorParam,
} from '@common/message/interfaces/message.interface';

export interface IMessageService {
    filterLanguage(customLanguage: string): string;
    setMessage(path: string, options?: IMessageSetOptions): string;
    setValidationMessage(
        issues: readonly StandardSchemaV1.Issue[],
        options?: IMessageErrorOptions
    ): IMessageValidationError[];
    setValidationImportMessage(
        errors: IMessageValidationImportErrorParam[],
        options?: IMessageErrorOptions
    ): IMessageValidationImportError[];
}
