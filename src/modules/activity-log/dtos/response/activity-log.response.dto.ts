import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import { RequestGeoLocationResponseSchema } from '@common/request/dtos/response/request.geo-location.response.dto';
import { RequestUserAgentResponseSchema } from '@common/request/dtos/response/request.user-agent.response.dto';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogMetadataResponseSchema } from '@modules/activity-log/dtos/response/activity-log.metadata.response.dto';
import { UserRefResponseSchema } from '@modules/user/dtos/response/user.ref.response.dto';

/**
 * Base activity-log shape: one recorded action with the user who owns the entry embedded.
 * @public
 */
export const ActivityLogResponseSchema = DatabaseResponseSchema.omit({
    updatedAt: true,
    updatedBy: true,
    deletedAt: true,
    deletedBy: true,
}).extend({
    createdBy: z.string().nullable().meta({
        description: 'Identifier of the user who performed the action',
        example: faker.string.uuid(),
    }),
    userId: z.string().meta({
        description:
            'Identifier of the user this entry belongs to: the actor for payload actions, the affected user for target actions',
        example: faker.string.uuid(),
    }),
    user: UserRefResponseSchema.meta({
        description:
            'Embedded user this entry belongs to: the actor for payload actions, the affected user for target actions',
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
    action: z.enum(EnumActivityLogAction).meta({
        description: 'Action recorded in the activity log',
        example: EnumActivityLogAction.userLoginCredential,
    }),
    description: z.string().meta({
        description: 'Description of the activity log',
        example: 'User login with credential',
    }),
    ipAddress: z.string().nullable().meta({
        description: 'IP address of the user performing the action',
        example: faker.internet.ipv4(),
    }),
    userAgent: RequestUserAgentResponseSchema.meta({
        description: 'Parsed user agent of the request that produced the log',
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
        description: 'Geo-location of the request that produced the log',
        example: {
            latitude: faker.location.latitude(),
            longitude: faker.location.longitude(),
            country: faker.location.country(),
            region: faker.location.state(),
            city: faker.location.city(),
        },
    }),
    metadata: ActivityLogMetadataResponseSchema.nullable().meta({
        description:
            'Metadata recorded with the entry; the keys present depend on the action',
        example: {
            targetUserId: faker.string.uuid(),
            targetUsername: faker.internet.username().toLowerCase(),
            timestamp: faker.date.recent().toISOString(),
        },
    }),
});

/**
 * One recorded activity-log action with the user who owns the entry.
 * @public
 */
export type ActivityLogResponseDto = z.infer<typeof ActivityLogResponseSchema>;
