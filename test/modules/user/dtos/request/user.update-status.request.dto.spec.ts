import { EnumUserStatus } from '@generated/prisma-client/client';
import { UserUpdateStatusRequestSchema } from '@modules/user/dtos/request/user.update-status.request.dto';

describe('UserUpdateStatusRequestSchema', () => {
    const payload = { status: EnumUserStatus.blocked };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserUpdateStatusRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a status outside EnumUserStatus', () => {
        expect(() =>
            UserUpdateStatusRequestSchema.parse({ status: 'unknownStatus' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserUpdateStatusRequestSchema.parse({
                ...payload,
                reason: 'policy violation',
            })
        ).toThrow();
    });
});
