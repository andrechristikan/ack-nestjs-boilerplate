import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { UserProfileResponseSchema } from '@modules/user/dtos/response/user.profile.response.dto';

describe('UserProfileResponseSchema', () => {
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
        termPolicy,
        photo: null,
        twoFactor: null,
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

    it('strips two-factor secret material', () => {
        const twoFactor = {
            id: 'two-factor-1',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: 'user-1',
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
            updatedBy: 'user-1',
            userId: 'user-1',
            enabled: true,
            requiredSetup: false,
            confirmedAt: new Date('2026-01-03T00:00:00.000Z'),
            secret: 'encrypted-secret',
            pendingSecret: 'encrypted-pending-secret',
            backupCodes: ['hash-one', 'hash-two'],
            attempt: 2,
            lastUsedAt: new Date('2026-01-04T00:00:00.000Z'),
        };

        const result = UserProfileResponseSchema.parse({
            ...row,
            twoFactor,
        });

        expect(result.twoFactor).not.toHaveProperty('secret');
        expect(result.twoFactor).not.toHaveProperty('pendingSecret');
        expect(result.twoFactor).not.toHaveProperty('backupCodes');
        expect(result.twoFactor).not.toHaveProperty('attempt');
        expect(result.twoFactor).not.toHaveProperty('lastUsedAt');
        expect(result.twoFactor).toEqual({
            id: twoFactor.id,
            createdAt: twoFactor.createdAt,
            createdBy: twoFactor.createdBy,
            updatedAt: twoFactor.updatedAt,
            updatedBy: twoFactor.updatedBy,
            userId: twoFactor.userId,
            enabled: twoFactor.enabled,
            requiredSetup: twoFactor.requiredSetup,
            confirmedAt: twoFactor.confirmedAt,
        });
    });
});
