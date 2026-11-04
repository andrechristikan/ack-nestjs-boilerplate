import { UserDeleteSelfRequestSchema } from '@modules/user/dtos/request/user.delete-self.request.dto';

describe('UserDeleteSelfRequestSchema', () => {
    const payload = { password: 'Current-pass1' };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserDeleteSelfRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an empty password', () => {
        expect(() =>
            UserDeleteSelfRequestSchema.parse({ password: '' })
        ).toThrow();
    });

    it('rejects a missing password', () => {
        expect(() => UserDeleteSelfRequestSchema.parse({})).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserDeleteSelfRequestSchema.parse({ ...payload, email: 'a@b.co' })
        ).toThrow();
    });
});
