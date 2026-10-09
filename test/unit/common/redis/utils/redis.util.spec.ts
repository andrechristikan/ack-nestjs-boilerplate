import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { RedisErrorMessages } from '@keyv/redis';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';
import { RedisUtil } from '@common/redis/utils/redis.util';

describe('RedisUtil', () => {
    let util: RedisUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [RedisUtil],
        }).compile();

        util = module.get(RedisUtil);
    });

    describe('toException', () => {
        it.each(['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'])(
            'returns null for an untyped Error with code %s',
            code => {
                const error = Object.assign(new Error('socket'), { code });

                expect(util.toException(error)).toBeNull();
            }
        );

        it('maps the keyv not-connected message to RedisUnavailableException', () => {
            const error = new Error(
                RedisErrorMessages.RedisClientNotConnectedThrown
            );

            expect(util.toException(error)).toBeInstanceOf(
                RedisUnavailableException
            );
        });

        it('returns null for an Error with an unrelated code', () => {
            const error = Object.assign(new Error('denied'), {
                code: 'EACCES',
            });

            expect(util.toException(error)).toBeNull();
        });

        it('returns null for an unrelated error', () => {
            expect(util.toException(new Error('boom'))).toBeNull();
        });

        it('returns null for a value that is not an Error', () => {
            expect(util.toException('ECONNREFUSED')).toBeNull();
        });
    });
});
