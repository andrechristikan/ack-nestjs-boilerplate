import { EnumUserStatus } from '@generated/prisma-client/client';
import { UserUpdateStatusRequestSchema } from '@modules/user/dtos/request/user.update-status.request.dto';

describe('UserUpdateStatusRequestSchema', () => {
    const payload = { status: EnumUserStatus.blocked };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserUpdateStatusRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a status outside EnumUserStatus', () => {
        const result = UserUpdateStatusRequestSchema.safeParse({
            status: 'unknownStatus',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['status'],
                code: 'invalid_value',
            }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = UserUpdateStatusRequestSchema.safeParse({
            ...payload,
            reason: 'policy violation',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
