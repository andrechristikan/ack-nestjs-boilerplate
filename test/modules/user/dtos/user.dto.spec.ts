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
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { UserSchema } from '@modules/user/dtos/user.dto';

describe('UserSchema', () => {
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
    };

    const photo = {
        bucket: 'user-bucket',
        key: 'users/user-1/profile/photo.jpg',
        cdnUrl: 'https://cdn.example.com/photo.jpg',
        completedUrl: 'https://cdn.example.com/photo.jpg',
        mime: 'image/jpeg',
        extension: 'jpg',
        access: EnumAwsS3Accessibility.public,
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
        username: 'john_doe',
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
        photo,
        twoFactor,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = UserSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses every nullable field as null', () => {
        const nullRow = {
            ...row,
            name: null,
            verifiedAt: null,
            passwordExpired: null,
            passwordCreated: null,
            passwordAttempt: null,
            gender: null,
            lastLoginAt: null,
            lastIPAddress: null,
            lastLoginFrom: null,
            lastLoginWith: null,
            photo: null,
            twoFactor: null,
        };

        const result = UserSchema.parse(nullRow);

        expect(result).toEqual(nullRow);
    });

    it('rejects a status outside EnumUserStatus', () => {
        expect(() =>
            UserSchema.parse({ ...row, status: 'unknownStatus' })
        ).toThrow();
    });

    it('strips an undeclared key', () => {
        const result = UserSchema.parse({
            ...row,
            password: 'hashed-password',
        });

        expect(result).toEqual(row);
        expect(result).not.toHaveProperty('password');
    });
});
