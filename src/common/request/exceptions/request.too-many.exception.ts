import { IAppException } from '@app/interfaces/app.interface';
import { IMessageValidationError } from '@common/message/interfaces/message.interface';
import { HttpException } from '@nestjs/common';

export class RequestTooManyException extends HttpException {
    constructor({
        statusCode,
        message,
        messageProperties,
        errors,
        _error,
    }: IAppException<unknown>) {
        super(
            {
                statusCode,
                message: message ?? 'request.error.tooManyRequests',
                messageProperties,
                errors: errors as IMessageValidationError[],
                _error,
            },
            429
        );
    }
}
