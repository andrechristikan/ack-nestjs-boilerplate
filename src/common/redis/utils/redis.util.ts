import { Injectable } from '@nestjs/common';
import { RedisErrorMessages } from '@keyv/redis';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';

/**
 * Maps the Keyv Redis not-connected failure to `RedisUnavailableException`.
 */
@Injectable()
export class RedisUtil {
    /**
     * Returns the exception for a Keyv Redis connection failure, or `null` for any other error.
     */
    toException(error: unknown): RedisUnavailableException | null {
        if (
            error instanceof Error &&
            error.message === RedisErrorMessages.RedisClientNotConnectedThrown
        ) {
            return new RedisUnavailableException();
        }

        return null;
    }
}
