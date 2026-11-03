/**
 * Injection token of the shared Keyv Redis client that backs the cache.
 * @public
 */
export const RedisClientCachedProvider = 'RedisClientCachedProvider';

/**
 * Lua lease-held set: KEYS[1] the entry key, KEYS[2] its lease key, ARGV[1] the lease token, ARGV[2] the serialized entry, ARGV[3] its TTL in ms; writes the entry and drops the lease only while the lease still holds the token, answering 1 when written and 0 otherwise.
 * @public
 */
export const RedisLeaseSetScript = `
if redis.call('GET', KEYS[2]) ~= ARGV[1] then
    return 0
end
redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[3])
redis.call('DEL', KEYS[2])
return 1
`;
