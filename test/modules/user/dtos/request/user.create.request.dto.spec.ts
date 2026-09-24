import { UserCreateRequestSchema } from '@modules/user/dtos/request/user.create.request.dto';

describe('UserCreateRequestSchema', () => {
    const valid = {
        username: 'newcomer',
        email: 'USER@example.com',
        roleId: '01890a5d-ac96-774b-bcce-b302099a8057',
        countryId: '01890a5d-ac96-774b-bcce-b302099a8058',
        name: 'New User',
    };

    it('normalizes the email and accepts UUID v7 ids', () => {
        expect(UserCreateRequestSchema.parse(valid)).toMatchObject({
            email: 'user@example.com',
            roleId: valid.roleId,
            countryId: valid.countryId,
        });
    });

    it('accepts input without the optional name', () => {
        const { name: _name, ...input } = valid;
        expect(UserCreateRequestSchema.safeParse(input).success).toBe(true);
    });

    it.each([
        { ...valid, roleId: 'bad' },
        { ...valid, roleId: '507f1f77bcf86cd799439011' },
        { ...valid, countryId: 'bad' },
        { ...valid, countryId: '507f1f77bcf86cd799439011' },
        { ...valid, email: 'bad' },
        { ...valid, name: '' },
        { ...valid, unknown: true },
    ])('rejects malformed, ObjectId, or unknown input', input => {
        expect(UserCreateRequestSchema.safeParse(input).success).toBe(false);
    });
});
