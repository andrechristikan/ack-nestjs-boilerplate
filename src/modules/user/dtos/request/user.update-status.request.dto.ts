import { z } from 'zod';
import { EnumUserStatus } from '@generated/prisma-client';

export const UserUpdateStatusRequestSchema = z.strictObject({
    status: z.enum(EnumUserStatus).meta({
        description: 'Account status to set on the user',
        default: EnumUserStatus.active,
        example: EnumUserStatus.active,
    }),
});

export type UserUpdateStatusRequestDto = z.infer<
    typeof UserUpdateStatusRequestSchema
>;
