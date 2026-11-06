/** @public */
export const RedisClientCachedProvider = 'RedisClientCachedProvider';

/** @public */
export const RedisLeaseSetScript = `
if redis.call('GET', KEYS[2]) ~= ARGV[1] then
    return 0
end
redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[3])
redis.call('DEL', KEYS[2])
return 1
`;
