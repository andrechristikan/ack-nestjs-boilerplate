import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRedisStatusCodeError } from '@common/redis/enums/redis.status-code.enum';

/** @public */
export class RedisUnavailableException extends AppBaseException {
    readonly module = 'redis';
    readonly statusCode = EnumRedisStatusCodeError.unavailable;
    readonly statusCodeKey = EnumRedisStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.SERVICE_UNAVAILABLE;

    constructor(override readonly rawError: unknown = null) {
        super('redis.error.unavailable', { rawError });
    }
}
