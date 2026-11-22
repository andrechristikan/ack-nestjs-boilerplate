import { z } from 'zod';
import { EnumUserReauthenticationAction } from '@generated/prisma-client/client';

/** @public */
export const UserReauthenticationSendRequestSchema = z.strictObject({
    action: z.enum(EnumUserReauthenticationAction).meta({
        description:
            'sensitive action the one-time code is bound to; the code works for this action only',
        example: EnumUserReauthenticationAction.mobileNumberDelete,
    }),
});

/** @public */
export type UserReauthenticationSendRequestDto = z.infer<
    typeof UserReauthenticationSendRequestSchema
>;
