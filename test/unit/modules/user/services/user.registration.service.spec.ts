import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
    EnumPasswordHistoryType,
    EnumTermPolicyType,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
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
    IUserLoginSocial,
    IUserSignUpResolved,
    IUserSignUpWorkspacePersonal,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitUserConfigValues } from '@test/unit/helpers/test.unit.user.helper';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { buildUser } from '@test/unit/helpers/test.unit.request.helper';

describe('UserRegistrationService', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const passwordHistoryService: MockProxy<PasswordHistoryService> =
        mock<PasswordHistoryService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();

    let service: UserRegistrationService;
    let databaseUtil: DatabaseUtil;
    let helperStringService: HelperStringService;
    let helperHashService: HelperHashService;

    const tx = {} as IDatabaseTransactionClient;
    const password: IAuthPassword = {
        passwordHash: 'hashed-password',
        passwordExpired: null,
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
    };
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
            password,
            passwordHistoryType: EnumPasswordHistoryType.signUp,
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
    const createdUser: IUser = buildUser(
        'user-ochre',
        'user-ochre@example.com'
    );
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
        userService.createManyInTx.mockResolvedValue(created);
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
                UserCreateUtil,
                AuthPasswordUtil,
                UserVerificationUtil,
                DatabaseUtil,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitUserConfigValues),
                },
                HelperDateService,
                HelperHashService,
                HelperStringService,
            ],
        }).compile();

        service = moduleRef.get(UserRegistrationService);
        databaseUtil = moduleRef.get(DatabaseUtil);
        helperStringService = moduleRef.get(HelperStringService);
        helperHashService = moduleRef.get(HelperHashService);
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
        const signUpNow = new Date('2026-03-01T00:00:00.000Z');
        const emailVerification: IUserVerificationEmailCreate = {
            type: 'email',
            expiredAt: new Date('2026-03-01T00:15:00.000Z'),
            expiredInMinutes: 15,
            resendInMinutes: 5,
            reference: 'VRF-halcyon',
            token: 'raw-token',
            hashedToken:
                '34d328009b123fbbb0dc93f18b3e6de1ecf7b1a5783c33dff7ffe1926f09e943',
            link: 'https://example.com/verify?token=raw-token',
        };
        const acceptedTermPolicyTypes = [
            EnumTermPolicyType.termsOfService,
            EnumTermPolicyType.privacy,
            EnumTermPolicyType.cookies,
            EnumTermPolicyType.marketing,
        ];

        beforeAll(() => {
            vi.useFakeTimers();
        });

        afterAll(() => {
            vi.useRealTimers();
        });

        beforeEach(() => {
            vi.setSystemTime(signUpNow);
            vi.spyOn(databaseUtil, 'createId').mockReturnValue(
                'user-id-halcyon'
            );
            vi.spyOn(helperStringService, 'random')
                .mockReturnValueOnce('raw-token')
                .mockReturnValueOnce('halcyon');
            vi.spyOn(helperHashService, 'argon2Hash').mockResolvedValue(
                'hashed'
            );
        });

        it('prepares the sign-up input and the email verification', async () => {
            const result = await service.prepareSignUp(signUpInput, resolved);

            expect(result.emailVerification).toEqual(emailVerification);
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
                password: {
                    passwordHash: 'hashed',
                    passwordExpired: null,
                    passwordCreated: signUpNow,
                    passwordPeriodExpired: new Date('2026-05-30T00:00:00.000Z'),
                },
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
            expect(result.input.acceptedTermPolicyTypes).toEqual([
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
            ]);
            expect(result.input).not.toHaveProperty('termPolicy');
        });
    });

    describe('buildCreateByAdminStages', () => {
        it('leads with the adminUserCreate row naming the created user, then the admin contract rows', () => {
            const input = { ...inputs[0]!, createdBy: 'admin-ochre' };
            const result = service.buildCreateByAdminStages(input, createdUser);

            expect(result).toEqual([
                {
                    action: EnumActivityLogAction.adminUserCreate,
                    metadata: {
                        targetUserId: createdUser.id,
                        targetUsername: createdUser.username,
                        timestamp: createdUser.createdAt,
                    },
                },
                {
                    action: UserCreateContract.admin.createdAction,
                    userId: createdUser.id,
                    createdBy: 'admin-ochre',
                    metadata: {
                        actorUserId: 'admin-ochre',
                        timestamp: createdUser.createdAt,
                    },
                },
                {
                    action: EnumActivityLogAction.workspaceCreatedByAdmin,
                    userId: createdUser.id,
                    createdBy: 'admin-ochre',
                    workspaceId: 'workspace-1',
                    metadata: { actorUserId: 'admin-ochre' },
                },
            ]);
        });
    });

    describe('buildSocialCreate', () => {
        const socialInput: IUserLoginSocial = {
            from: EnumUserSignUpFrom.mobile,
            username: 'ochreFinch',
            name: 'Ochre Quill',
            inviteToken: null,
            countryId: 'country-ochre',
            cookies: true,
            marketing: false,
            device: {
                fingerprint: 'device-ochre',
                name: null,
                platform: EnumDevicePlatform.web,
                notificationToken: null,
            },
        };

        const now = new Date('2026-03-01T00:00:00.000Z');

        beforeAll(() => {
            vi.useFakeTimers();
        });

        afterAll(() => {
            vi.useRealTimers();
        });

        beforeEach(() => {
            vi.spyOn(databaseUtil, 'createId').mockReturnValue('user-id-ochre');
            vi.setSystemTime(now);
        });

        it('stores the email trimmed and lowercased', () => {
            const result = service.buildSocialCreate(
                '  Ochre@Example.COM ',
                EnumUserLoginWith.socialGoogle,
                socialInput,
                resolved
            );

            expect(result.email).toBe('ochre@example.com');
        });

        it('builds a Google social create input from the resolved ids, verified at creation time', () => {
            const result = service.buildSocialCreate(
                'ochre@example.com',
                EnumUserLoginWith.socialGoogle,
                socialInput,
                resolved
            );

            expect(result).toMatchObject({
                userId: 'user-id-ochre',
                email: 'ochre@example.com',
                username: 'ochreFinch',
                roleId: resolved.roleId,
                countryId: 'country-ochre',
                signUpFrom: EnumUserSignUpFrom.mobile,
                signUpWith: EnumUserSignUpWith.socialGoogle,
                isVerified: true,
                verifiedAt: now,
                password: null,
                passwordHistoryType:
                    UserCreateContract.social.passwordHistoryType,
                verification: null,
                workspaceContext,
                createdBy: 'user-id-ochre',
                acceptedTermPolicyTypes: expect.arrayContaining([
                    EnumTermPolicyType.cookies,
                ]),
            });
            expect(result).not.toHaveProperty('termPolicy');
        });

        it('builds an Apple social create input with no optional term policy accepted', () => {
            const result = service.buildSocialCreate(
                'ochre@example.com',
                EnumUserLoginWith.socialApple,
                { ...socialInput, cookies: false, marketing: false },
                resolved
            );

            expect(result).toMatchObject({
                signUpWith: EnumUserSignUpWith.socialApple,
                acceptedTermPolicyTypes: [
                    EnumTermPolicyType.termsOfService,
                    EnumTermPolicyType.privacy,
                ],
            });
        });

        it('keeps a null name and accepts marketing when no name is given', () => {
            const result = service.buildSocialCreate(
                'ochre@example.com',
                EnumUserLoginWith.socialGoogle,
                { ...socialInput, name: null, marketing: true },
                resolved
            );

            expect(result).toMatchObject({
                name: null,
                acceptedTermPolicyTypes: expect.arrayContaining([
                    EnumTermPolicyType.marketing,
                ]),
            });
        });
    });

    describe('buildAcceptedTermPolicyTypes', () => {
        it('returns the required types followed by cookies and marketing when both are accepted', () => {
            expect(service['buildAcceptedTermPolicyTypes'](true, true)).toEqual(
                [
                    EnumTermPolicyType.termsOfService,
                    EnumTermPolicyType.privacy,
                    EnumTermPolicyType.cookies,
                    EnumTermPolicyType.marketing,
                ]
            );
        });

        it('returns the required types alone when neither is accepted', () => {
            expect(
                service['buildAcceptedTermPolicyTypes'](false, false)
            ).toEqual([
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
            ]);
        });

        it('adds cookies alone when only cookies is accepted', () => {
            expect(
                service['buildAcceptedTermPolicyTypes'](true, false)
            ).toEqual([
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
                EnumTermPolicyType.cookies,
            ]);
        });

        it('adds marketing alone when only marketing is accepted', () => {
            expect(
                service['buildAcceptedTermPolicyTypes'](false, true)
            ).toEqual([
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
                EnumTermPolicyType.marketing,
            ]);
        });
    });

    describe('buildPasswordHistoryEntries', () => {
        it('maps each input holding a password and a history type, skipping the rest', () => {
            const withPassword: IUserCreateWithWorkspaceInput = {
                ...inputs[0]!,
                password,
                passwordHistoryType: EnumPasswordHistoryType.admin,
                createdBy: 'admin-ochre',
            };
            const social: IUserCreateWithWorkspaceInput = {
                ...inputs[0]!,
                userId: 'user-social',
                password: null,
                passwordHistoryType: null,
            };

            expect(
                service['buildPasswordHistoryEntries']([withPassword, social])
            ).toEqual([
                {
                    userId: 'user-ochre',
                    password: 'hashed-password',
                    type: EnumPasswordHistoryType.admin,
                    expiredAt: password.passwordPeriodExpired,
                    createdAt: password.passwordCreated,
                    createdBy: 'admin-ochre',
                },
            ]);
        });
    });

    describe('buildUserIds', () => {
        it('lists the user id of every input in order', () => {
            expect(
                service['buildUserIds']([
                    inputs[0]!,
                    { ...inputs[0]!, userId: 'user-second' },
                ])
            ).toEqual(['user-ochre', 'user-second']);
        });
    });

    describe('resolveSocialFeatureFlagKey', () => {
        it('returns the google flag key for a google sign-in', () => {
            expect(
                service['resolveSocialFeatureFlagKey'](
                    EnumUserLoginWith.socialGoogle
                )
            ).toBe(EnumFeatureFlagKey.loginWithGoogle);
        });

        it('returns the apple flag key for an apple sign-in', () => {
            expect(
                service['resolveSocialFeatureFlagKey'](
                    EnumUserLoginWith.socialApple
                )
            ).toBe(EnumFeatureFlagKey.loginWithApple);
        });
    });
});
