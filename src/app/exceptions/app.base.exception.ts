import { HttpStatus } from '@nestjs/common';
import { IAppBaseExceptionOptions } from '@app/interfaces/app.interface';
import { IMessageProperties } from '@common/message/interfaces/message.interface';

export abstract class AppBaseException extends Error {
    abstract readonly module: string;
    abstract readonly statusCode: number;
    abstract readonly statusCodeKey: string;
    abstract readonly httpStatus: HttpStatus;

    readonly messageProperties?: IMessageProperties;
    readonly metadata?: Record<string, unknown>;
    readonly rawError?: unknown;
    readonly data?: unknown;

    constructor(
        readonly messagePath: string,
        options?: IAppBaseExceptionOptions
    ) {
        super(messagePath);

        this.messageProperties = options?.messageProperties;
        this.metadata = options?.metadata;
        this.rawError = options?.rawError;
        this.data = options?.data;
    }
}
