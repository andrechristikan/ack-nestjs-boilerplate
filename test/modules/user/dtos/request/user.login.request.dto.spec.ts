import { EnumUserLoginFrom } from '@generated/prisma-client';
import { UserLoginRequestSchema } from '@modules/user/dtos/request/user.login.request.dto';
describe('UserLoginRequestSchema', () => {
    const valid = {
        email: ' USER@EXAMPLE.COM ',
        password: 'password',
        from: EnumUserLoginFrom.website,
        device: { fingerprint: 'fingerprint' },
    };
    it('normalizes valid credentials', () =>
        expect(UserLoginRequestSchema.parse(valid).email).toBe(
            'user@example.com'
        ));
    it.each([
        { ...valid, email: 'bad' },
        { ...valid, password: '' },
        { ...valid, device: { fingerprint: 'x', unknown: true } },
        { ...valid, unknown: true },
    ])('rejects malformed or unknown credentials', input =>
        expect(UserLoginRequestSchema.safeParse(input).success).toBe(false)
    );
});
