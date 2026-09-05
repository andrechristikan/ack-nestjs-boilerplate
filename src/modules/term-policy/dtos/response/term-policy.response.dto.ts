import { z } from 'zod';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client';
import { TermContentSchema } from '@modules/term-policy/dtos/term-policy.content.dto';

/**
 * Base term-policy shape: the stored terms or policy row with its localized contents.
 */
export const TermPolicyResponseSchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
}).extend({
    type: z.enum(EnumTermPolicyType).meta({
        description: 'Type of terms or policy',
        example: EnumTermPolicyType.termsOfService,
    }),
    status: z.enum(EnumTermPolicyStatus).meta({
        description: 'Status of terms or policy',
        example: EnumTermPolicyStatus.draft,
    }),
    contents: z.array(TermContentSchema).meta({
        description: 'Localized contents of the terms or policy',
        example: [],
    }),
    version: z.number().meta({
        description: 'Version of the terms or policy',
        example: 1,
    }),
    publishedAt: z.date().nullable().meta({
        description: 'Published date of the terms or policy',
        example: '2023-01-01T00:00:00.000Z',
    }),
});

export type TermPolicyResponseDto = z.infer<typeof TermPolicyResponseSchema>;
