import { z } from 'zod';
import { EnumUserStatus } from '@generated/prisma-client/client';

/** @public */
export const UserUpdateStatusRequestSchema = z.strictObject({
    status: z.enum(EnumUserStatus).meta({
        description: 'Account status to set on the user',
        default: EnumUserStatus.active,
        example: EnumUserStatus.active,
    }),
});

/** @public */
export type UserUpdateStatusRequestDto = z.infer<
    typeof UserUpdateStatusRequestSchema
>;
