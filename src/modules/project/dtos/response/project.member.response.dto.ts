import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import { EnumProjectMemberRole } from '@generated/prisma-client';
import { UserRefResponseSchema } from '@modules/user/dtos/response/user.ref.response.dto';

/**
 * Base project-member shape: the row binding a user to the project they are assigned to.
 */
export const ProjectMemberResponseSchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
}).extend({
    projectId: z.string().meta({
        description: 'Identifier of the project the member belongs to',
        example: faker.database.mongodbObjectId(),
    }),
    userId: z.string().meta({
        description: 'Identifier of the member user',
        example: faker.database.mongodbObjectId(),
    }),
    user: UserRefResponseSchema.meta({
        description: 'Embedded user of this project member',
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
    role: z.enum(EnumProjectMemberRole).meta({
        description: 'Project role of the member',
        example: EnumProjectMemberRole.member,
    }),
    joinedAt: z.date().meta({
        description: 'When the user joined the project',
        example: faker.date.past(),
    }),
});

export type ProjectMemberResponseDto = z.infer<
    typeof ProjectMemberResponseSchema
>;
