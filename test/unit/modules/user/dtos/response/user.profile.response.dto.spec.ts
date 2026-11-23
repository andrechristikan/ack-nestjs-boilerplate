import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import {
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import { UserProfileResponseSchema } from '@modules/user/dtos/response/user.profile.response.dto';

describe('UserProfileResponseSchema', () => {
    const role = {
        id: 'role-1',
        name: 'Admin',
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.admin,
    };

    const country = {
        id: 'country-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: 'user-1',
        name: 'Indonesia',
        alpha2Code: 'ID',
        alpha3Code: 'IDN',
        phoneCode: ['62'],
        continent: 'Asia',
        timezone: 'Asia/Jakarta',
    };

    const mobileNumber = {
        id: 'mobile-number-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: 'user-1',
        number: '81234567890',
        phoneCode: '62',
        country,
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
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        countryId: 'country-1',
        gender: EnumUserGender.male,
        lastLoginAt: new Date('2026-02-01T00:00:00.000Z'),
        lastIPAddress: '127.0.0.1',
        lastLoginFrom: EnumUserLoginFrom.website,
        lastLoginWith: EnumUserLoginWith.credential,
        photo: null,
        country,
        mobileNumbers: [mobileNumber],
    };

    it('parses a row into exactly the declared fields', () => {
        const result = UserProfileResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses an empty mobileNumbers list', () => {
        const emptyRow = { ...row, mobileNumbers: [] };

        const result = UserProfileResponseSchema.parse(emptyRow);

        expect(result).toEqual(emptyRow);
    });

    it('strips an undeclared key', () => {
        const result = UserProfileResponseSchema.parse({
            ...row,
            password: 'hashed-password',
        });

        expect(result).toEqual(row);
        expect(result).not.toHaveProperty('password');
    });

    it('strips the mfa key', () => {
        const result = UserProfileResponseSchema.parse({
            ...row,
            mfa: {
                id: 'mfa-1',
                userId: 'user-1',
                backupCodes: ['encrypted-backup-code'],
                attempt: 0,
                lockedUntil: null,
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: 'user-1',
                updatedAt: new Date('2026-01-02T00:00:00.000Z'),
                updatedBy: 'user-1',
            },
        });

        expect(result).toEqual(row);
        expect(result).not.toHaveProperty('mfa');
    });
});
