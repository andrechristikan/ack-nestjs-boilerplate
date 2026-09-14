import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumWorkspaceMemberRole,
    type Country,
} from '@generated/prisma-client';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { CountryService } from '@modules/country/services/country.service';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleService } from '@modules/role/services/role.service';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import { UserImportEmailExistException } from '@modules/user/exceptions/user.import-email-exist.exception';
import { UserImportUsernameExistException } from '@modules/user/exceptions/user.import-username-exist.exception';
import { UserUsernameContainBadWordException } from '@modules/user/exceptions/user.username-contain-bad-word.exception';
import type {
    IUser,
    IUserSignUpWorkspacePersonal,
} from '@modules/user/interfaces/user.interface';
import { UserImportRepository } from '@modules/user/repositories/user.import.repository';
import { UserOnboardingRepository } from '@modules/user/repositories/user.onboarding.repository';
import { UserImportService } from '@modules/user/services/user.import.service';
import { UserOnboardingService } from '@modules/user/services/user.onboarding.service';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { UserUtil } from '@modules/user/utils/user.util';

describe('UserImportService', () => {
    const userImportRepository = {
        findByEmails: vi.fn<UserImportRepository['findByEmails']>(),
        findByUsernames: vi.fn<UserImportRepository['findByUsernames']>(),
        findExport: vi.fn<UserImportRepository['findExport']>(),
    } satisfies Pick<
        UserImportRepository,
        'findByEmails' | 'findByUsernames' | 'findExport'
    >;
    const userOnboardingRepository = {
        createManyWithWorkspace:
            vi.fn<UserOnboardingRepository['createManyWithWorkspace']>(),
    } satisfies Pick<UserOnboardingRepository, 'createManyWithWorkspace'>;
    const roleService = {
        existByName: vi.fn<RoleService['existByName']>(),
    } satisfies Pick<RoleService, 'existByName'>;
    const countryService = {
        existByAlpha2Code: vi.fn<CountryService['existByAlpha2Code']>(),
    } satisfies Pick<CountryService, 'existByAlpha2Code'>;
    const userUtil = {
        checkBadWord: vi.fn<UserUtil['checkBadWord']>(),
    } satisfies Pick<UserUtil, 'checkBadWord'>;
    const userOnboardingUtil = {
        mapCreateCollision: vi.fn<UserOnboardingUtil['mapCreateCollision']>(),
    } satisfies Pick<UserOnboardingUtil, 'mapCreateCollision'>;
    const userOnboardingService = {
        buildPersonalWorkspaceContexts:
            vi.fn<UserOnboardingService['buildPersonalWorkspaceContexts']>(),
        buildOnboardingActivityLogs:
            vi.fn<UserOnboardingService['buildOnboardingActivityLogs']>(),
        buildWorkspaceRows:
            vi.fn<UserOnboardingService['buildWorkspaceRows']>(),
    } satisfies Pick<
        UserOnboardingService,
        | 'buildPersonalWorkspaceContexts'
        | 'buildOnboardingActivityLogs'
        | 'buildWorkspaceRows'
    >;
    const authPasswordService = {
        createPasswordRandom:
            vi.fn<AuthPasswordService['createPasswordRandom']>(),
        createPassword: vi.fn<AuthPasswordService['createPassword']>(),
    } satisfies Pick<
        AuthPasswordService,
        'createPasswordRandom' | 'createPassword'
    >;
    const databaseUtil = {
        createId: vi.fn<DatabaseUtil['createId']>(),
    } satisfies Pick<DatabaseUtil, 'createId'>;
    const notificationQueue = {
        sendWelcomeByAdmin: vi.fn<NotificationQueue['sendWelcomeByAdmin']>(),
    } satisfies Pick<NotificationQueue, 'sendWelcomeByAdmin'>;
    const helperDateService = {
        formatToIso: vi.fn<HelperDateService['formatToIso']>(),
    } satisfies Pick<HelperDateService, 'formatToIso'>;
    const requestStoreGet = vi.fn((_key: string): unknown => null);
    const requestStoreService = {
        get<T>(key: string): T | null {
            return requestStoreGet(key) as T | null;
        },
    } satisfies Pick<RequestStoreService, 'get'>;
    const configGet = vi.fn((_key: string): unknown => undefined);
    const configService = {
        get<T>(key: string): T | undefined {
            return configGet(key) as T | undefined;
        },
    } satisfies Pick<ConfigService, 'get'>;

    const now = new Date('2026-01-01T00:00:00.000Z');
    const expiredAt = new Date('2026-02-01T00:00:00.000Z');
    const requestLog = {
        userAgent: { ua: 'browser' },
        ipAddress: '127.0.0.1',
        geoLocation: null,
    };
    const role = {
        id: 'role-id',
        name: 'User',
        description: null,
        type: EnumRoleType.user,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    };
    const country = {
        id: 'country-id',
        name: 'Indonesia',
        alpha2Code: 'ID',
        alpha3Code: 'IDN',
        continent: 'Asia',
        timezone: 'Asia/Jakarta',
        phoneCodes: ['+62'],
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    } satisfies Country;
    const password = {
        passwordHash: 'password-hash',
        passwordExpired: expiredAt,
        passwordCreated: now,
        passwordPeriodExpired: expiredAt,
        passwordEncrypted: 'encrypted-password',
    } satisfies IAuthPassword;
    const workspaceContext = {
        type: EnumUserSignUpWorkspaceContextType.personal,
        workspaceId: 'workspace-id',
        slugCandidates: ['imported-user'],
        name: 'Imported User',
    } satisfies IUserSignUpWorkspacePersonal;
    const user = {
        id: 'user-id',
        name: 'Imported User',
        username: 'imported',
        isVerified: false,
        verifiedAt: null,
        email: 'imported@example.com',
        roleId: role.id,
        password: password.passwordHash,
        passwordExpired: expiredAt,
        passwordCreated: now,
        passwordAttempt: 0,
        signUpAt: now,
        signUpFrom: EnumUserSignUpFrom.admin,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
        countryId: country.id,
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        createdAt: now,
        createdBy: 'admin-id',
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        termsOfServiceAccepted: true,
        privacyAccepted: true,
        cookiesAccepted: false,
        marketingAccepted: false,
        role: { ...role, policies: [] },
        twoFactor: null,
    } satisfies IUser;

    let service: UserImportService;

    beforeEach(async () => {
        vi.resetAllMocks();
        requestStoreGet.mockReturnValue(requestLog);
        configGet.mockImplementation((key: string) => {
            const values = {
                'user.default.role': 'User',
                'user.default.country': 'ID',
            };

            return values[key as keyof typeof values];
        });
        roleService.existByName.mockResolvedValue(role);
        countryService.existByAlpha2Code.mockResolvedValue(country);
        userImportRepository.findByEmails.mockResolvedValue([]);
        userImportRepository.findByUsernames.mockResolvedValue([]);
        userUtil.checkBadWord.mockResolvedValue(false);
        databaseUtil.createId.mockReturnValue(user.id);
        authPasswordService.createPasswordRandom.mockReturnValue(
            'plain-password'
        );
        authPasswordService.createPassword.mockReturnValue(password);
        userOnboardingService.buildPersonalWorkspaceContexts.mockReturnValue([
            workspaceContext,
        ]);
        userOnboardingService.buildOnboardingActivityLogs.mockReturnValue([]);
        userOnboardingService.buildWorkspaceRows.mockReturnValue({
            workspace: null,
            workspaceMember: {
                data: {
                    workspaceId: workspaceContext.workspaceId,
                    userId: user.id,
                    role: EnumWorkspaceMemberRole.owner,
                    createdBy: 'admin-id',
                },
            },
            workspaceInvite: null,
            projectMember: null,
        });
        userOnboardingRepository.createManyWithWorkspace.mockResolvedValue([
            user,
        ]);
        helperDateService.formatToIso.mockReturnValue(
            '2026-02-01T00:00:00.000Z'
        );
        userImportRepository.findExport.mockResolvedValue([]);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UserImportService,
                {
                    provide: UserImportRepository,
                    useValue: userImportRepository,
                },
                {
                    provide: UserOnboardingRepository,
                    useValue: userOnboardingRepository,
                },
                { provide: RoleService, useValue: roleService },
                { provide: CountryService, useValue: countryService },
                { provide: UserUtil, useValue: userUtil },
                { provide: UserOnboardingUtil, useValue: userOnboardingUtil },
                {
                    provide: UserOnboardingService,
                    useValue: userOnboardingService,
                },
                { provide: AuthPasswordService, useValue: authPasswordService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: RequestStoreService, useValue: requestStoreService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = moduleRef.get(UserImportService);
    });

    describe('importByAdmin', () => {
        it('creates users with default role, country, credential password, policy acceptance, and welcome notifications', async () => {
            await service.importByAdmin(
                [
                    {
                        username: 'imported',
                        email: user.email,
                        name: user.name!,
                    },
                ],
                'admin-id'
            );

            expect(roleService.existByName).toHaveBeenCalledWith('User');
            expect(countryService.existByAlpha2Code).toHaveBeenCalledWith('ID');
            expect(
                userOnboardingRepository.createManyWithWorkspace
            ).toHaveBeenCalledWith([
                expect.objectContaining({
                    userId: user.id,
                    email: user.email,
                    username: 'imported',
                    countryId: country.id,
                    roleId: role.id,
                    signUpFrom: EnumUserSignUpFrom.admin,
                    signUpWith: EnumUserSignUpWith.credential,
                    isVerified: false,
                    termPolicy: {
                        [EnumTermPolicyType.cookies]: false,
                        [EnumTermPolicyType.marketing]: false,
                        [EnumTermPolicyType.privacy]: true,
                        [EnumTermPolicyType.termsOfService]: true,
                    },
                    acceptedTermPolicyTypes: [
                        EnumTermPolicyType.termsOfService,
                        EnumTermPolicyType.privacy,
                    ],
                    password,
                    verification: null,
                    workspaceContext,
                    createdBy: 'admin-id',
                }),
            ]);
            expect(notificationQueue.sendWelcomeByAdmin).toHaveBeenCalledWith(
                user.id,
                {
                    password: password.passwordEncrypted,
                    passwordCreatedAt: '2026-02-01T00:00:00.000Z',
                    passwordExpiredAt: '2026-02-01T00:00:00.000Z',
                },
                'admin-id'
            );
        });

        it('throws UserImportEmailExistException when any imported email already exists', async () => {
            userImportRepository.findByEmails.mockResolvedValue([
                { email: user.email },
            ]);

            await expect(
                service.importByAdmin(
                    [{ username: 'imported', email: user.email }],
                    'admin-id'
                )
            ).rejects.toBeInstanceOf(UserImportEmailExistException);
            expect(
                userOnboardingRepository.createManyWithWorkspace
            ).not.toHaveBeenCalled();
        });

        it('throws RoleNotFoundException when the default role is absent', async () => {
            roleService.existByName.mockResolvedValue(null);

            await expect(
                service.importByAdmin(
                    [{ username: 'imported', email: user.email }],
                    'admin-id'
                )
            ).rejects.toBeInstanceOf(RoleNotFoundException);
        });

        it('throws CountryNotFoundException when the default country is absent', async () => {
            countryService.existByAlpha2Code.mockResolvedValue(null);

            await expect(
                service.importByAdmin(
                    [{ username: 'imported', email: user.email }],
                    'admin-id'
                )
            ).rejects.toBeInstanceOf(CountryNotFoundException);
        });

        it('throws UserImportUsernameExistException for duplicate usernames inside the import file', async () => {
            await expect(
                service.importByAdmin(
                    [
                        { username: 'dupe', email: 'one@example.com' },
                        { username: 'dupe', email: 'two@example.com' },
                    ],
                    'admin-id'
                )
            ).rejects.toBeInstanceOf(UserImportUsernameExistException);
        });

        it('throws UserUsernameContainBadWordException when any username contains a bad word', async () => {
            userUtil.checkBadWord
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true);

            await expect(
                service.importByAdmin(
                    [
                        { username: 'clean', email: 'one@example.com' },
                        { username: 'blocked', email: 'two@example.com' },
                    ],
                    'admin-id'
                )
            ).rejects.toBeInstanceOf(UserUsernameContainBadWordException);
        });
    });

    describe('exportByAdmin', () => {
        it('delegates export filters to the repository', async () => {
            const status = { status: { in: ['active'] } };
            const roleId = { roleId: { equals: 'role-id' } };
            const countryId = { countryId: { equals: 'country-id' } };

            await expect(
                service.exportByAdmin(status, roleId, countryId)
            ).resolves.toEqual([]);
            expect(userImportRepository.findExport).toHaveBeenCalledWith(
                status,
                roleId,
                countryId
            );
        });
    });
});
