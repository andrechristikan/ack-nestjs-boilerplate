import { EnumUserStatus } from '@generated/prisma-client/client';
import { UserExportResponseSchema } from '@modules/user/dtos/response/user.export.response.dto';

describe('UserExportResponseSchema', () => {
    const row = {
        id: 'user-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: 'user-1',
        deletedAt: null,
        deletedBy: null,
        name: 'John Doe',
        username: 'johnSmith123',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'john.doe@example.com',
        roleId: 'role-1',
        status: EnumUserStatus.active,
        countryId: 'country-1',
        photo: 'https://example.com/photo.jpg',
        termPolicyTermsOfService: true,
        termPolicyPrivacy: true,
        termPolicyCookies: true,
        termPolicyMarketing: false,
        role: 'admin',
    };

    it('parses a row into exactly the declared fields', () => {
        const result = UserExportResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses a null photo', () => {
        const nullRow = { ...row, photo: null };

        const result = UserExportResponseSchema.parse(nullRow);

        expect(result).toEqual(nullRow);
    });

    it('rejects a nested role object as a type mismatch', () => {
        expect(() =>
            UserExportResponseSchema.parse({
                ...row,
                role: { name: 'admin' },
            })
        ).toThrow();
    });

    it('strips an undeclared key such as password', () => {
        const result = UserExportResponseSchema.parse({
            ...row,
            password: 'hashed-password',
        });

        expect(result).toEqual(row);
        expect(result).not.toHaveProperty('password');
    });
});
