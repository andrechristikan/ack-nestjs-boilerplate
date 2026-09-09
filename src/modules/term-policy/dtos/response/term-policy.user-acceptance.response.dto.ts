import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client';
import { TermPolicyResponseSchema } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { UserRefResponseSchema } from '@modules/user/dtos/response/user.ref.response.dto';

export const TermPolicyUserAcceptanceResponseSchema =
    DatabaseResponseSchema.omit({
        updatedAt: true,
        updatedBy: true,
        deletedAt: true,
        deletedBy: true,
    }).extend({
        userId: z.string().meta({
            description:
                'Identifier of the user who accepted the terms or policy',
            example: faker.string.uuid(),
        }),
        user: UserRefResponseSchema.meta({
            description: 'Embedded user who accepted the terms or policy',
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
        termPolicyId: z.string().meta({
            description: 'Identifier of the terms or policy accepted',
            example: faker.string.uuid(),
        }),
        termPolicy: TermPolicyResponseSchema.meta({
            description: 'Embedded terms or policy that was accepted',
            example: {
                id: faker.string.uuid(),
                createdAt: faker.date.recent(),
                createdBy: faker.string.uuid(),
                updatedAt: faker.date.recent(),
                updatedBy: faker.string.uuid(),
                type: EnumTermPolicyType.termsOfService,
                status: EnumTermPolicyStatus.draft,
                contents: [],
                version: 1,
                publishedAt: '2023-01-01T00:00:00.000Z',
            },
        }),
        acceptedAt: z.date().meta({
            description: 'Date when the terms or policy was accepted',
            example: faker.date.recent(),
        }),
    });

export type TermPolicyUserAcceptanceResponseDto = z.infer<
    typeof TermPolicyUserAcceptanceResponseSchema
>;
