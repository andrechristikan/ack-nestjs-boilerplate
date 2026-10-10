import { UserTwoFactorEnableRequestSchema } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
describe('UserTwoFactorEnableRequestSchema', () => {
    it('accepts a numeric code', () =>
        expect(
            UserTwoFactorEnableRequestSchema.safeParse({ code: '123456' })
                .success
        ).toBe(true));
    it.each([{ code: '' }, { code: 'abc' }, { code: '123', unknown: true }])(
        'rejects malformed or unknown input',
        input =>
            expect(
                UserTwoFactorEnableRequestSchema.safeParse(input).success
            ).toBe(false)
    );
    it('returns the two-factor error for a non-numeric code', () => {
        expect(() =>
            UserTwoFactorEnableRequestSchema.parse({ code: 'invalid' })
        ).toThrow('auth.error.twoFactorCodeRequired');
    });
});
