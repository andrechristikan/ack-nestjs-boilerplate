import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumTermPolicyType } from '@generated/prisma-client/client';

/** @public */
export const TermPolicyPendingResponseSchema = z.object({
    termPolicies: z
        .array(
            z.object({
                id: z.string().meta({
                    description: 'Identifier of the terms or policy',
                    example: faker.database.mongodbObjectId(),
                }),
                type: z.enum(EnumTermPolicyType).meta({
                    description: 'Type of the terms or policy',
                    example: EnumTermPolicyType.privacy,
                }),
                version: z.number().meta({
                    description: 'Version of the terms or policy',
                    example: 1,
                }),
            })
        )
        .meta({
            description:
                'Latest published required terms or policies the user has not accepted',
        }),
});

/** @public */
export type TermPolicyPendingResponseDto = z.infer<
    typeof TermPolicyPendingResponseSchema
>;
