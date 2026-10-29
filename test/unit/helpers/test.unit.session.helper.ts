import type KeyvRedis from '@keyv/redis';
import type Keyv from 'keyv';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

type RedisClientConnection = Awaited<
    ReturnType<KeyvRedis<string>['getClient']>
>;

export interface IStubRedisClient {
    set: (
        key: string,
        value: string,
        options: unknown
    ) => Promise<string | null>;
}

export interface ISessionCacheDoubles {
    keyv: MockProxy<Keyv>;
    store: MockProxy<KeyvRedis<string>>;
}

export function stubSessionCacheClient(
    doubles: ISessionCacheDoubles,
    reply: string | null
): MockProxy<IStubRedisClient> {
    doubles.store.createKeyPrefix.mockReturnValue('prefixed-key');
    doubles.store.namespace = 'session';
    doubles.keyv.serializeData.mockResolvedValue('serialized-value');
    const client: MockProxy<IStubRedisClient> = mock<IStubRedisClient>();
    client.set.mockResolvedValue(reply);
    doubles.store.getClient.mockResolvedValue(
        client as unknown as RedisClientConnection
    );

    return client;
}
