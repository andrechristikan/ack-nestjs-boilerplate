import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { UserListResponseSchema } from '@modules/user/dtos/response/user.list.response.dto';

describe('UserListResponseSchema', () => {
    const policy = {
        id: 'policy-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: 'user-1',
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.manage],
    };

    const role = {
        id: 'role-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: 'user-1',
        name: 'Admin',
        description: 'Administrator role',
        type: EnumRoleType.admin,
        policies: [policy],
    };

    const termPolicy = {
        termsOfService: true,
        privacy: true,
        cookies: true,
        marketing: false,
    };

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
        role,
        status: EnumUserStatus.active,
        countryId: 'country-1',
        termPolicy,
        photo: null,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = UserListResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips password, sign-up, last-login, gender, and twoFactor detail', () => {
        const result = UserListResponseSchema.parse({
            ...row,
            password: 'hashed-password',
            passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
            passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
            passwordAttempt: 0,
            signUpAt: new Date('2026-01-01T00:00:00.000Z'),
            signUpFrom: EnumUserSignUpFrom.website,
            gender: null,
            lastLoginAt: null,
            lastIPAddress: null,
            lastLoginFrom: null,
            lastLoginWith: null,
            twoFactor: null,
        });

        expect(result).toEqual(row);
        expect(result).not.toHaveProperty('password');
    });
});
