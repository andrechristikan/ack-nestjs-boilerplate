import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { RequestGeoLocationResponseSchema } from '@common/request/dtos/response/request.geo-location.response.dto';
import { RequestUserAgentResponseSchema } from '@common/request/dtos/response/request.user-agent.response.dto';
import { UserRefResponseSchema } from '@modules/user/dtos/response/user.ref.response.dto';

/**
 * Base session shape: the stored session row without the JWT identifier.
 */
export const SessionResponseSchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
}).extend({
    userId: z.string().meta({
        description: 'Identifier of the user who owns the session',
        example: faker.string.uuid(),
    }),
    user: UserRefResponseSchema.meta({
        description: 'Embedded user who owns the session',
        example: {
            id: faker.string.uuid(),
            createdAt: faker.date.recent(),
            createdBy: faker.string.uuid(),
            updatedAt: faker.date.recent(),
            updatedBy: faker.string.uuid(),
            deletedAt: faker.date.recent(),
            deletedBy: faker.string.uuid(),
            name: faker.person.fullName(),
            username: faker.internet.username().toLowerCase(),
            photo: {
                bucket: faker.string.alpha({ length: 10, casing: 'upper' }),
                key: faker.system.filePath(),
                cdnUrl: `${faker.internet.url()}/${faker.system.filePath()}`,
                completedUrl: `${faker.internet.url()}/${faker.system.filePath()}`,
                mime: 'image/jpeg',
                extension: 'jpg',
                access: EnumAwsS3Accessibility.public,
                size: 1024,
            },
        },
    }),
    deviceOwnershipId: z.string().meta({
        description: 'Identifier of the device ownership bound to the session',
        example: faker.string.uuid(),
    }),
    ipAddress: z.string().nullable().meta({
        description: 'IP address recorded for the session',
        example: faker.internet.ipv4(),
    }),
    userAgent: RequestUserAgentResponseSchema.meta({
        description: 'Parsed user agent recorded for the session',
        example: {
            ua: faker.internet.userAgent(),
            browser: {
                name: 'Chrome',
                version: '112.0.5615.49',
                major: '112',
                type: 'mobile',
            },
            cpu: {
                architecture: 'amd64',
            },
            device: {
                type: 'mobile',
                vendor: 'Apple',
                model: 'iPhone',
            },
            engine: {
                name: 'WebKit',
                version: '537.36',
            },
            os: {
                name: 'iOS',
                version: '16.3.1',
            },
        },
    }),
    geoLocation: RequestGeoLocationResponseSchema.nullable().meta({
        description: 'Geo-location recorded for the session',
        example: {
            latitude: faker.location.latitude(),
            longitude: faker.location.longitude(),
            country: faker.location.country(),
            region: faker.location.state(),
            city: faker.location.city(),
        },
    }),
    expiredAt: z.date().meta({
        description: 'When the session expires',
        example: faker.date.future(),
    }),
    revokedAt: z.date().nullable().meta({
        description: 'When the session was revoked',
        example: faker.date.future(),
    }),
    isRevoked: z.boolean().meta({
        description: 'Whether the session has been revoked',
        example: false,
    }),
    revokedById: z.string().nullable().meta({
        description: 'Identifier of the user who revoked the session',
        example: faker.string.uuid(),
    }),
    revokedBy: UserRefResponseSchema.nullable().meta({
        description: 'Embedded user who revoked the session',
        example: {
            id: faker.string.uuid(),
            createdAt: faker.date.recent(),
            createdBy: faker.string.uuid(),
            updatedAt: faker.date.recent(),
            updatedBy: faker.string.uuid(),
            deletedAt: faker.date.recent(),
            deletedBy: faker.string.uuid(),
            name: faker.person.fullName(),
            username: faker.internet.username().toLowerCase(),
            photo: {
                bucket: faker.string.alpha({ length: 10, casing: 'upper' }),
                key: faker.system.filePath(),
                cdnUrl: `${faker.internet.url()}/${faker.system.filePath()}`,
                completedUrl: `${faker.internet.url()}/${faker.system.filePath()}`,
                mime: 'image/jpeg',
                extension: 'jpg',
                access: EnumAwsS3Accessibility.public,
                size: 1024,
            },
        },
    }),
});

export type SessionResponseDto = z.infer<typeof SessionResponseSchema>;
