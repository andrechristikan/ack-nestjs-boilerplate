import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRedisStatusCodeError } from '@common/redis/enums/redis.status-code.enum';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';

describe('RedisUnavailableException', () => {
    describe('constructor', () => {
        it('declares the redis module contract for an unreachable Redis', () => {
            const exception = new RedisUnavailableException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'redis',
                statusCode: EnumRedisStatusCodeError.unavailable,
                statusCodeKey:
                    EnumRedisStatusCodeError[
                        EnumRedisStatusCodeError.unavailable
                    ],
                httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
                messagePath: 'redis.error.unavailable',
            });
        });

        it('carries the caught error as rawError and cause', () => {
            const error = new Error('The client is offline');

            const exception = new RedisUnavailableException(error);

            expect(exception).toMatchObject({
                rawError: error,
                cause: error,
            });
        });
    });
});
