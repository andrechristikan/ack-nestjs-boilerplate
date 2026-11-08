import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import {
    EnumPasswordHistoryType,
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import type { IPasswordHistoryCreate } from '@modules/password-history/interfaces/password-history.interface';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserRegistrationService } from '@modules/user/services/user.registration.service';
import { UserService } from '@modules/user/services/user.service';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserSignUpResolved,
    IUserSignUpWorkspacePersonal,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';

describe('UserRegistrationService', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const passwordHistoryService: MockProxy<PasswordHistoryService> =
        mock<PasswordHistoryService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const userCreateUtil: MockProxy<UserCreateUtil> = mock<UserCreateUtil>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const userVerificationUtil: MockProxy<UserVerificationUtil> =
        mock<UserVerificationUtil>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    let service: UserRegistrationService;

    const tx = {} as IDatabaseTransactionClient;
    const inputs: IUserCreateWithWorkspaceInput[] = [
        {
            userId: 'user-ochre',
            email: 'user-ochre@example.com',
            name: null,
            username: 'user-ochre',
            countryId: 'country-1',
            roleId: 'role-1',
            signUpFrom: EnumUserSignUpFrom.website,
            signUpWith: EnumUserSignUpWith.credential,
            isVerified: false,
            verifiedAt: null,
            acceptedTermPolicyTypes: [],
            password: null,
            passwordHistoryType: null,
            verification: null,
            workspaceContext: {
                type: EnumUserSignUpWorkspaceContextType.personal,
                workspaceId: 'workspace-1',
                slugCandidates: ['user-ochre'],
                name: 'user-ochre',
            },
            createdBy: 'user-ochre',
        },
    ];
    const createdUser: IUser = {
        id: 'user-ochre',
        name: null,
        username: 'user-ochre',
        isVerified: false,
        verifiedAt: null,
        email: 'user-ochre@example.com',
        roleId: 'role-1',
        password: null,
        passwordExpired: null,
        passwordCreated: null,
        passwordAttempt: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-1',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-1',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            isImmutable: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };
    const created: IUser[] = [createdUser];
    const histories: IPasswordHistoryCreate[] = [
        {
            userId: 'user-ochre',
            password: 'hashed-password',
            type: EnumPasswordHistoryType.signUp,
            expiredAt: new Date('2026-04-01T00:00:00.000Z'),
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: 'user-ochre',
        },
    ];
    const userIds = ['user-ochre'];
    const email = 'ochre@example.com';

    const workspaceContext: IUserSignUpWorkspacePersonal = {
        type: EnumUserSignUpWorkspaceContextType.personal,
        workspaceId: 'workspace-halcyon',
        slugCandidates: ['w-halcyon'],
        name: "halcyonVane's Workspace",
    };
    const resolved: IUserSignUpResolved = {
        roleId: 'role-halcyon',
        workspaceContext,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        userService.createManyInTx.mockResolvedValue(created);
        userCreateUtil.buildPasswordHistoryEntries.mockReturnValue(histories);
        userCreateUtil.buildUserIds.mockReturnValue(userIds);
        userCreateUtil.resolveSocialFeatureFlagKey.mockReturnValue(
            EnumFeatureFlagKey.loginWithGoogle
        );
        featureFlagService.getMetadataByKey.mockResolvedValue({
            [EnumFeatureFlagMetadataKey.signUpAllowed]: true,
        });
        userAuthService.getOneByEmail.mockResolvedValue(null);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UserRegistrationService,
                { provide: UserService, useValue: userService },
                { provide: UserAuthService, useValue: userAuthService },
                {
                    provide: PasswordHistoryService,
                    useValue: passwordHistoryService,
                },
                { provide: NotificationService, useValue: notificationService },
                { provide: FeatureFlagService, useValue: featureFlagService },
                { provide: UserCreateUtil, useValue: userCreateUtil },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                {
                    provide: UserVerificationUtil,
                    useValue: userVerificationUtil,
                },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();

        service = moduleRef.get(UserRegistrationService);
    });

    describe('createInTx', () => {
        it('creates the users, then the password histories, then the notification defaults, on one tx', async () => {
            await service.createInTx(tx, inputs);

            expect(userService.createManyInTx).toHaveBeenCalledWith(tx, inputs);
            expect(passwordHistoryService.createManyInTx).toHaveBeenCalledWith(
                tx,
                histories
            );
            expect(
                notificationService.createDefaultsManyInTx
            ).toHaveBeenCalledWith(tx, userIds);
            expect(userService.createManyInTx).toHaveBeenCalledBefore(
                passwordHistoryService.createManyInTx
            );
            expect(
                passwordHistoryService.createManyInTx
            ).toHaveBeenCalledBefore(
                notificationService.createDefaultsManyInTx
            );
        });

        it('returns the created users', async () => {
            const result = await service.createInTx(tx, inputs);

            expect(result).toBe(created);
        });
    });

    describe('isSocialSignUpAllowed', () => {
        it('returns true when no user holds the email and signUpAllowed is true', async () => {
            const result = await service.isSocialSignUpAllowed(
                email,
                EnumUserLoginWith.socialGoogle
            );

            expect(result).toBe(true);
            expect(
                userCreateUtil.resolveSocialFeatureFlagKey
            ).toHaveBeenCalledWith(EnumUserLoginWith.socialGoogle);
            expect(featureFlagService.getMetadataByKey).toHaveBeenCalledWith(
                EnumFeatureFlagKey.loginWithGoogle
            );
            expect(userAuthService.getOneByEmail).toHaveBeenCalledWith(email);
        });

        it('returns false when a user holds the email', async () => {
            userAuthService.getOneByEmail.mockResolvedValue(createdUser);

            const result = await service.isSocialSignUpAllowed(
                email,
                EnumUserLoginWith.socialGoogle
            );

            expect(result).toBe(false);
            expect(featureFlagService.getMetadataByKey).toHaveBeenCalledWith(
                EnumFeatureFlagKey.loginWithGoogle
            );
            expect(userAuthService.getOneByEmail).toHaveBeenCalledWith(email);
        });

        it('returns false when the flag has no metadata', async () => {
            featureFlagService.getMetadataByKey.mockResolvedValue(null);

            const result = await service.isSocialSignUpAllowed(
                email,
                EnumUserLoginWith.socialGoogle
            );

            expect(result).toBe(false);
            expect(featureFlagService.getMetadataByKey).toHaveBeenCalledWith(
                EnumFeatureFlagKey.loginWithGoogle
            );
            expect(userAuthService.getOneByEmail).toHaveBeenCalledWith(email);
        });

        it('returns false when signUpAllowed is false', async () => {
            featureFlagService.getMetadataByKey.mockResolvedValue({
                [EnumFeatureFlagMetadataKey.signUpAllowed]: false,
            });

            const result = await service.isSocialSignUpAllowed(
                email,
                EnumUserLoginWith.socialGoogle
            );

            expect(result).toBe(false);
            expect(featureFlagService.getMetadataByKey).toHaveBeenCalledWith(
                EnumFeatureFlagKey.loginWithGoogle
            );
            expect(userAuthService.getOneByEmail).toHaveBeenCalledWith(email);
        });
    });

    describe('prepareSignUp', () => {
        const signUpInput = {
            countryId: 'country-halcyon',
            email: 'halcyon@example.com',
            username: 'halcyonVane',
            password: 'plain-password',
            name: 'Halcyon Vane',
            inviteToken: null,
            from: EnumUserSignUpFrom.website,
            cookies: true,
            marketing: true,
        };
        const emailVerification: IUserVerificationEmailCreate = {
            type: 'email',
            expiredAt: new Date('2026-03-05T00:00:00.000Z'),
            expiredInMinutes: 15,
            resendInMinutes: 5,
            reference: 'VRF-halcyon',
            token: 'raw-token',
            hashedToken: 'hashed-token',
            link: 'https://example.com/verify?token=raw-token',
        };
        const acceptedTermPolicyTypes = [
            EnumTermPolicyType.termsOfService,
            EnumTermPolicyType.privacy,
            EnumTermPolicyType.cookies,
            EnumTermPolicyType.marketing,
        ];

        beforeEach(() => {
            databaseUtil.createId.mockReturnValue('user-id-halcyon');
            authPasswordUtil.createPassword.mockResolvedValue({
                passwordHash: 'hashed',
                passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
                passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
                passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
            });
            userVerificationUtil.createEmail.mockReturnValue(emailVerification);
            userCreateUtil.buildAcceptedTermPolicyTypes.mockReturnValue(
                acceptedTermPolicyTypes
            );
        });

        it('prepares the sign-up input and the email verification', async () => {
            const result = await service.prepareSignUp(signUpInput, resolved);

            expect(result.emailVerification).toBe(emailVerification);
            expect(result.input).toMatchObject({
                userId: 'user-id-halcyon',
                email: signUpInput.email,
                username: signUpInput.username,
                roleId: 'role-halcyon',
                signUpFrom: EnumUserSignUpFrom.website,
                signUpWith: EnumUserSignUpWith.credential,
                isVerified: false,
                verifiedAt: null,
                acceptedTermPolicyTypes,
                createdBy: 'user-id-halcyon',
                verification: {
                    reference: emailVerification.reference,
                    token: emailVerification.hashedToken,
                    type: EnumVerificationType.email,
                    to: signUpInput.email,
                    expiredAt: emailVerification.expiredAt,
                    verifiedAt: null,
                    isUsed: false,
                },
            });
            expect(
                userCreateUtil.buildAcceptedTermPolicyTypes
            ).toHaveBeenCalledWith(true, true);
        });

        it('defaults name to null and skips cookies and marketing when neither is accepted', async () => {
            const result = await service.prepareSignUp(
                {
                    ...signUpInput,
                    name: null,
                    cookies: false,
                    marketing: false,
                },
                resolved
            );

            expect(result.input.name).toBeNull();
            expect(
                userCreateUtil.buildAcceptedTermPolicyTypes
            ).toHaveBeenCalledWith(false, false);
            expect(result.input).not.toHaveProperty('termPolicy');
        });
    });
});
