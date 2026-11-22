import { EnumUserStatus } from '@generated/prisma-client';
import { UserUpdateStatusRequestSchema } from '@modules/user/dtos/request/user.update-status.request.dto';
describe('UserUpdateStatusRequestSchema', () => {
    it('accepts a defined status', () =>
        expect(
            UserUpdateStatusRequestSchema.safeParse({
                status: EnumUserStatus.active,
            }).success
        ).toBe(true));
    it.each([
        { status: 'invalid' },
        { status: EnumUserStatus.active, unknown: true },
    ])('rejects invalid or unknown input', input =>
        expect(UserUpdateStatusRequestSchema.safeParse(input).success).toBe(
            false
        )
    );
});
