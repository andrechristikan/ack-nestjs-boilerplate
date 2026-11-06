import { Injectable } from '@nestjs/common';
import { RedisErrorMessages } from '@keyv/redis';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';

@Injectable()
export class RedisUtil {
    /** Maps a Keyv Redis not-connected error to `RedisUnavailableException`; null for any other error. */
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
