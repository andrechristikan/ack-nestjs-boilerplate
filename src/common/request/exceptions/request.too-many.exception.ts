import { IAppException } from '@app/interfaces/app.interface';
import { IMessageValidationError } from '@common/message/interfaces/message.interface';
import { HttpException } from '@nestjs/common';

/**
 * Exception thrown when a client exceeds the configured rate limit.
 * Maps to HTTP 429 Too Many Requests.
 */
export class RequestTooManyException extends HttpException {
    /**
     * @param {IAppException<unknown>} options - Standard app exception shape with statusCode, message, and optional extras.
     */
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
