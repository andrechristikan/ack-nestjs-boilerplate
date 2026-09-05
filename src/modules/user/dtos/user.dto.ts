import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { AwsS3ResponseSchema } from '@common/aws/dtos/response/aws.s3.response.dto';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import {
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client';
import { RoleSchema } from '@modules/role/dtos/role.dto';
import { UserTermPolicySchema } from '@modules/user/dtos/user.term-policy.dto';
import { UserTwoFactorSchema } from '@modules/user/dtos/user.two-factor.dto';

/**
 * Base user shape: the stored user row with its role, term-policy flags, photo and two-factor state.
 */
export const UserSchema = DatabaseResponseSchema.extend({
    name: z.string().min(1).max(100).nullable().meta({
        description: 'Display name of the user',
        example: faker.person.fullName(),
    }),
    username: z.string().meta({
        description: 'Unique username of the user',
        example: faker.internet.username().toLowerCase(),
    }),
    isVerified: z.boolean().meta({
        description: 'Whether the user email is verified',
        example: true,
    }),
    verifiedAt: z.date().nullable().meta({
        description: 'When the user email was verified',
        example: faker.date.past(),
    }),
    email: z.string().max(100).meta({
        description: 'Email address of the user',
        example: faker.internet.email(),
    }),
    roleId: z.string().meta({
        description: 'Identifier of the role assigned to the user',
        example: faker.string.uuid(),
    }),
    role: RoleSchema.meta({
        description: 'Role assigned to the user',
    }),
    passwordExpired: z.date().nullable().meta({
        description: 'When the current password expires',
        example: faker.date.future(),
    }),
    passwordCreated: z.date().nullable().meta({
        description: 'When the current password was created',
        example: faker.date.past(),
    }),
    passwordAttempt: z.number().min(0).nullable().meta({
        description: 'Count of consecutive failed password attempts',
        example: 0,
    }),
    signUpAt: z.date().meta({
        description: 'When the user signed up',
        example: faker.date.recent(),
    }),
    signUpFrom: z.enum(EnumUserSignUpFrom).meta({
        description: 'Channel the user signed up from',
        example: EnumUserSignUpFrom.admin,
    }),
    signUpWith: z.enum(EnumUserSignUpWith).meta({
        description: 'Credential method the user signed up with',
        example: EnumUserSignUpWith.credential,
    }),
    status: z.enum(EnumUserStatus).meta({
        description: 'Account status of the user',
        example: EnumUserStatus.active,
    }),
    countryId: z.string().meta({
        description: 'Identifier of the user country',
        example: faker.string.uuid(),
    }),
    gender: z.enum(EnumUserGender).nullable().meta({
        description: 'Gender of the user',
        example: EnumUserGender.male,
    }),
    lastLoginAt: z.date().nullable().meta({
        description: 'Last login time of user',
        example: faker.date.recent(),
    }),
    lastIPAddress: z.string().nullable().meta({
        description: 'Last IP Address of user',
        example: faker.internet.ipv4(),
    }),
    lastLoginFrom: z.enum(EnumUserLoginFrom).nullable().meta({
        description: 'Channel of the last login',
        example: EnumUserLoginFrom.website,
    }),
    lastLoginWith: z.enum(EnumUserLoginWith).nullable().meta({
        description: 'Credential method of the last login',
        example: EnumUserLoginWith.credential,
    }),
    termPolicy: UserTermPolicySchema.meta({
        description: 'Term-policy acceptance flags for the user',
    }),
    photo: AwsS3ResponseSchema.omit({ size: true }).nullable().meta({
        description: 'Profile photo stored in S3',
    }),
    twoFactor: UserTwoFactorSchema.nullable().meta({
        description: 'Two-factor authentication state of the user',
    }),
});

export type UserDto = z.infer<typeof UserSchema>;
