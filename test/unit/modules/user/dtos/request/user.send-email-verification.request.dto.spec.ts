import { UserSendEmailVerificationRequestSchema } from '@modules/user/dtos/request/user.send-email-verification.request.dto';

describe('UserSendEmailVerificationRequestSchema', () => {
    const payload = { email: 'john.doe@example.com' };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserSendEmailVerificationRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserSendEmailVerificationRequestSchema.parse({
                ...payload,
                username: 'john',
            })
        ).toThrow();
    });
});
