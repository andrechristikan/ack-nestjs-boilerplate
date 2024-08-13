import { ValidationError } from '@nestjs/common';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';
import {
    IMessageErrorOptions,
    IMessageSetOptions,
    IMessageValidationError,
    IMessageValidationImportError,
    IMessageValidationImportErrorParam,
} from 'src/common/message/interfaces/message.interface';

export interface IMessageService {
    getAvailableLanguages(): ENUM_MESSAGE_LANGUAGE[];
    getLanguage(): ENUM_MESSAGE_LANGUAGE;
    filterLanguage(customLanguage: string): string[];
    setMessage(path: string, options?: IMessageSetOptions): string;
    setValidationMessage(
        errors: ValidationError[],
        options?: IMessageErrorOptions
    ): IMessageValidationError[];
    setValidationImportMessage(
        errors: IMessageValidationImportErrorParam[],
        options?: IMessageErrorOptions
    ): IMessageValidationImportError[];
}
