import { z } from 'zod';
import { EnumUserStatus } from '@generated/prisma-client/client';

/**
 * Validates the body for changing a user status as an admin.
 * @public
 */
export const UserUpdateStatusRequestSchema = z.strictObject({
    status: z.enum(EnumUserStatus).meta({
        description: 'Account status to set on the user',
        default: EnumUserStatus.active,
        example: EnumUserStatus.active,
    }),
});

/**
 * Body for changing a user status as an admin.
 * @public
 */
export type UserUpdateStatusRequestDto = z.infer<
    typeof UserUpdateStatusRequestSchema
>;
