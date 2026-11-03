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
    eval: (script: string, options: unknown) => Promise<unknown>;
    getDel: (key: string) => Promise<string | null>;
}

export interface ICacheStoreDoubles {
    keyv: MockProxy<Keyv>;
    store: MockProxy<KeyvRedis<string>>;
}

/** Wires the Keyv store double so a cache builds `prefixed-<key>` keys, serializes to `serialized-value`, and talks to one store client double. */
export function stubStoreClient(
    doubles: ICacheStoreDoubles
): MockProxy<IStubRedisClient> {
    doubles.store.createKeyPrefix.mockImplementation(
        (key: string) => `prefixed-${key}`
    );
    doubles.store.namespace = 'cache';
    doubles.keyv.serializeData.mockResolvedValue('serialized-value');
    const client: MockProxy<IStubRedisClient> = mock<IStubRedisClient>();
    doubles.store.getClient.mockResolvedValue(
        client as unknown as RedisClientConnection
    );

    return client;
}
