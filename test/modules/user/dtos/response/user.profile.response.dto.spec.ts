import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import {
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
    it('selects a profile, nested country, and mobile numbers without secrets', () => {
        const now = new Date();
        const audit = {
            id: 'id',
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
        };
        const country = {
            ...audit,
            name: 'Italy',
            alpha2Code: 'IT',
            alpha3Code: 'ITA',
            phoneCodes: ['39'],
            continent: 'Europe',
            timezone: 'Europe/Rome',
        };
        const result = UserProfileResponseSchema.parse({
            ...audit,
            deletedAt: null,
            deletedBy: null,
            name: null,
            username: 'user',
            isVerified: true,
            verifiedAt: null,
            email: 'user@example.com',
            roleId: 'role-id',
            role: {
                ...audit,
                name: 'User',
                description: null,
                type: EnumRoleType.user,
                policies: [],
            },
            passwordExpired: null,
            passwordCreated: null,
            passwordAttempt: null,
            signUpAt: now,
            signUpFrom: EnumUserSignUpFrom.website,
            signUpWith: EnumUserSignUpWith.credential,
            status: EnumUserStatus.active,
            countryId: 'country-id',
            gender: EnumUserGender.female,
            lastLoginAt: null,
            lastIPAddress: null,
            lastLoginFrom: EnumUserLoginFrom.website,
            lastLoginWith: EnumUserLoginWith.credential,
            termsOfServiceAccepted: true,
            privacyAccepted: true,
            cookiesAccepted: true,
            marketingAccepted: false,
            photo: {
                bucket: 'bucket',
                key: 'profile.jpg',
                cdnUrl: null,
                completedUrl: 'https://example.com/profile.jpg',
                mime: 'image/jpeg',
                extension: 'jpg',
                access: EnumAwsS3Accessibility.public,
                size: 1024,
                internal: true,
            },
            twoFactor: null,
            country,
            mobileNumbers: [
                {
                    ...audit,
                    number: '12345678',
                    phoneCode: '39',
                    country,
                    secret: 'hidden',
                },
            ],
            password: 'hidden',
        });

        expect(result.name).toBeNull();
        expect(result.photo?.cdnUrl).toBeNull();
        expect(result.photo).not.toHaveProperty('size');
        expect(result.mobileNumbers[0]).not.toHaveProperty('secret');
        expect(result).not.toHaveProperty('password');
    });
});
