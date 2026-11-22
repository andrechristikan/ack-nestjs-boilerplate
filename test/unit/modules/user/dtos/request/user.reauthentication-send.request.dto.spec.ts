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
        expect(() => UserReauthenticationSendRequestSchema.parse({})).toThrow();
    });

    it('rejects an unknown action', () => {
        expect(() =>
            UserReauthenticationSendRequestSchema.parse({ action: 'logout' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserReauthenticationSendRequestSchema.parse({
                action: EnumUserReauthenticationAction.deleteSelf,
                otp: '123456',
            })
        ).toThrow();
    });
});
