import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import { RequestGeoLocationResponseSchema } from '@common/request/dtos/response/request.geo-location.response.dto';
import { RequestUserAgentResponseSchema } from '@common/request/dtos/response/request.user-agent.response.dto';
import { EnumActivityLogAction } from '@generated/prisma-client';
import { UserRefResponseSchema } from '@modules/user/dtos/response/user.ref.response.dto';

/**
 * Base activity-log shape: one recorded action with the actor embedded.
 */
export const ActivityLogResponseSchema = DatabaseResponseSchema.omit({
    updatedAt: true,
    updatedBy: true,
    deletedAt: true,
    deletedBy: true,
}).extend({
    userId: z.string().meta({
        description: 'Identifier of the user who performed the action',
        example: faker.string.uuid(),
    }),
    user: UserRefResponseSchema.meta({
        description: 'Embedded user who performed the action',
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
    metadata: z.unknown().meta({
        description: 'Additional metadata related to the activity log',
        example: { exampleKey: 'exampleValue' },
    }),
});

export type ActivityLogResponseDto = z.infer<typeof ActivityLogResponseSchema>;
