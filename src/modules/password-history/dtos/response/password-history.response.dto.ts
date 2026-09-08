import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import { EnumPasswordHistoryType } from '@generated/prisma-client';
import { UserRefResponseSchema } from '@modules/user/dtos/response/user.ref.response.dto';

/**
 * Base password-history shape: one recorded password of a user, without the stored hash.
 */
export const PasswordHistoryResponseSchema = DatabaseResponseSchema.omit({
    updatedAt: true,
    updatedBy: true,
    deletedAt: true,
    deletedBy: true,
}).extend({
    userId: z.string().meta({
        description: 'Identifier of the user whose password history this is',
        example: faker.database.mongodbObjectId(),
    }),
    user: UserRefResponseSchema.meta({
        description: 'Embedded user whose password history this is',
        example: {
            id: faker.database.mongodbObjectId(),
            createdAt: faker.date.recent(),
            createdBy: faker.database.mongodbObjectId(),
            updatedAt: faker.date.recent(),
            updatedBy: faker.database.mongodbObjectId(),
            deletedAt: faker.date.recent(),
            deletedBy: faker.database.mongodbObjectId(),
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
    type: z.enum(EnumPasswordHistoryType).meta({
        description: 'How this password history entry was created',
        example: EnumPasswordHistoryType.admin,
    }),
    expiredAt: z.date().meta({
        description: 'When this password history entry expires',
        example: faker.date.future(),
    }),
});

export type PasswordHistoryResponseDto = z.infer<
    typeof PasswordHistoryResponseSchema
>;
