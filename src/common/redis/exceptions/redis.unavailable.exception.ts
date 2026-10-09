import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRedisStatusCodeError } from '@common/redis/enums/redis.status-code.enum';

/**
 * Raised when Redis cannot be reached or its client is closed, offline, or out of retries.
 * @public
 */
export class RedisUnavailableException extends AppBaseException {
    readonly module = 'redis';
    readonly statusCode = EnumRedisStatusCodeError.unavailable;
    readonly statusCodeKey = EnumRedisStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.SERVICE_UNAVAILABLE;

    constructor() {
        super('redis.error.unavailable');
    }
}
