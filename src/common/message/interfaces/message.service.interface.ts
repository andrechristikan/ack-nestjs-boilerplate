import { ValidationError } from '@nestjs/common';
import {
    IErrors,
    IErrorsImport,
    IValidationErrorImport,
} from 'src/common/error/interfaces/error.interface';
import {
    IMessage,
    IMessageOptions,
    IMessageSetOptions,
} from 'src/common/message/interfaces/message.interface';

export interface IMessageService {
    setMessage(lang: string, key: string, options?: IMessageSetOptions): any;

    getRequestErrorsMessage(
        requestErrors: ValidationError[],
        customLanguages?: string[]
    ): Promise<IErrors[]>;

    getImportErrorsMessage(
        errors: IValidationErrorImport[],
        customLanguages?: string[]
    ): Promise<IErrorsImport[]>;

    get(key: string, options?: IMessageOptions): Promise<string | IMessage>;
}
