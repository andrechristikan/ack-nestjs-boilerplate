import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client';
import { UserRefResponseSchema } from '@modules/user/dtos/response/user.ref.response.dto';

/**
 * Base workspace-member shape: the row binding a user to the workspace they belong to.
 */
export const WorkspaceMemberResponseSchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
}).extend({
    workspaceId: z.string().meta({
        description: 'Identifier of the workspace the member belongs to',
        example: faker.string.uuid(),
    }),
    userId: z.string().meta({
        description: 'Identifier of the member user',
        example: faker.string.uuid(),
    }),
    user: UserRefResponseSchema.meta({
        description: 'Embedded user of this workspace member',
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
    role: z.enum(EnumWorkspaceMemberRole).meta({
        description: 'Workspace role of the member',
        example: EnumWorkspaceMemberRole.member,
    }),
    joinedAt: z.date().meta({
        description: 'When the user joined the workspace',
        example: faker.date.past(),
    }),
});

export type WorkspaceMemberResponseDto = z.infer<
    typeof WorkspaceMemberResponseSchema
>;
