import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumAwsS3Accessibility } from '@generated/prisma-client/client';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import { RoleRefResponseSchema } from '@modules/role/dtos/response/role.ref.response.dto';
import { UserRefResponseSchema } from '@modules/user/dtos/response/user.ref.response.dto';

/** @public */
export const ProjectMemberResponseSchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
}).extend({
    projectId: z.string().meta({
        description: 'Identifier of the project the member belongs to',
        example: faker.string.uuid(),
    }),
    userId: z.string().meta({
        description: 'Identifier of the member user',
        example: faker.string.uuid(),
    }),
    user: UserRefResponseSchema.meta({
        description: 'Embedded user of this project member',
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
    role: RoleRefResponseSchema.meta({
        description: 'Project role of the member',
    }),
    joinedAt: z.date().meta({
        description: 'When the user joined the project',
        example: faker.date.past(),
    }),
});

/** @public */
export type ProjectMemberResponseDto = z.infer<
    typeof ProjectMemberResponseSchema
>;
