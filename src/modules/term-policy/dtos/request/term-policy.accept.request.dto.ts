import { z } from 'zod';
import { EnumTermPolicyType } from '@generated/prisma-client/client';

/**
 * Validates the body for accepting the latest term policy of a type.
 * @public
 */
export const TermPolicyAcceptRequestSchema = z.strictObject({
    type: z.enum(EnumTermPolicyType).meta({
        description: 'Type of the terms policy',
        example: EnumTermPolicyType.privacy,
    }),
});

/**
 * Body for accepting the latest term policy of a type.
 * @public
 */
export type TermPolicyAcceptRequestDto = z.infer<
    typeof TermPolicyAcceptRequestSchema
>;
