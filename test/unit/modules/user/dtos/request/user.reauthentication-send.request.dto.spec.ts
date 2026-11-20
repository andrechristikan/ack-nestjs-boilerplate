import { EnumUserReauthenticationAction } from '@generated/prisma-client/client';
import { UserReauthenticationSendRequestSchema } from '@modules/user/dtos/request/user.reauthentication-send.request.dto';

describe('UserReauthenticationSendRequestSchema', () => {
    it.each(Object.values(EnumUserReauthenticationAction))(
        'parses the %s action into exactly the declared field',
        action => {
            const result = UserReauthenticationSendRequestSchema.parse({
                action,
            });

            expect(result).toEqual({ action });
        }
    );

    it('rejects a missing action', () => {
        const result = UserReauthenticationSendRequestSchema.safeParse({});

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['action'],
                code: 'invalid_value',
            }),
        ]);
    });

    it('rejects an unknown action', () => {
        const result = UserReauthenticationSendRequestSchema.safeParse({
            action: 'logout',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['action'],
                code: 'invalid_value',
            }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = UserReauthenticationSendRequestSchema.safeParse({
            action: EnumUserReauthenticationAction.deleteSelf,
            otp: '123456',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
