import { Prisma } from '@generated/prisma-client/client';
import { UserRefSelect } from '@modules/user/constants/user.constant';

/**
 * Columns an analytic session read returns: identity, origin, time, geo-location, and user agent.
 * @public
 */
export const SessionAnalyticSelect = {
    id: true,
    userId: true,
    ipAddress: true,
    createdAt: true,
    geoLocation: true,
    userAgent: true,
} satisfies Prisma.SessionSelect;

/**
 * Columns a session list read returns; the token identifier is never among them.
 * @public
 */
export const SessionListSelect = {
    id: true,
    userId: true,
    deviceOwnershipId: true,
    ipAddress: true,
    userAgent: true,
    geoLocation: true,
    expiredAt: true,
    revokedAt: true,
    isRevoked: true,
    revokedById: true,
    createdAt: true,
    createdBy: true,
    updatedAt: true,
    updatedBy: true,
    user: {
        select: UserRefSelect,
    },
    revokedBy: {
        select: UserRefSelect,
    },
} satisfies Prisma.SessionSelect;

/**
 * Lua compare-and-set of the login entry: KEYS[1] the entry key, ARGV[1] the expected jti digest, ARGV[2] the serialized rotated entry, ARGV[3] its TTL in ms; answers `updated`, `mismatch`, or `absent`.
 * @public
 */
export const SessionCacheUpdateLoginScript = `
local raw = redis.call('GET', KEYS[1])
if not raw then
    return 'absent'
end
local entry = cjson.decode(raw)
if entry.value.jti ~= ARGV[1] then
    return 'mismatch'
end
redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[3])
return 'updated'
`;
