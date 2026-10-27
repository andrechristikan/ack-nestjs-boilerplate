import { UserTwoFactorStatusResponseSchema } from '@modules/user/dtos/response/user.two-factor-status.response.dto';
describe('UserTwoFactorStatusResponseSchema', () => {
    const valid = {
        isEnabled: false,
        isPendingConfirmation: false,
        backupCodesRemaining: 0,
        confirmedAt: null,
        lastUsedAt: null,
    };
    it('preserves nullable state at the zero boundary', () =>
        expect(UserTwoFactorStatusResponseSchema.parse(valid)).toEqual(valid));
    it('rejects a negative backup-code count', () =>
        expect(
            UserTwoFactorStatusResponseSchema.safeParse({
                ...valid,
                backupCodesRemaining: -1,
            }).success
        ).toBe(false));
});
