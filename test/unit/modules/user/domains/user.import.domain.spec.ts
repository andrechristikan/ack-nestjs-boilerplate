import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { EnumCountryStatusCodeError } from '@modules/country/enums/country.status-code.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { UserImportDomain } from '@modules/user/domains/user.import.domain';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';

describe('UserImportDomain', () => {
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const countryDomain: MockProxy<CountryDomain> = mock<CountryDomain>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userOnboardingDomain: MockProxy<UserOnboardingDomain> =
        mock<UserOnboardingDomain>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let domain: UserImportDomain;

    const configValues: Record<string, string | number> = {
        'user.default.role': 'user',
        'user.default.country': 'US',
        'user.maxDataExport': 2,
    };

    const role: IRole = {
        id: 'role-thistle',
        type: EnumRoleType.user,
        name: 'user',
    };
    const roleWithPolicies: IRoleWithPolicies = {
        id: role.id,
        name: role.name,
        description: null,
        type: role.type,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        policies: [],
    };

    const baseUser: IUser = {
        id: 'user-thistle',
        name: 'Thistle Rowe',
        username: 'thistleRowe',
        isVerified: false,
        verifiedAt: null,
        email: 'thistle@example.com',
        roleId: role.id,
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.admin,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-thistle',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: false,
        },
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: roleWithPolicies,
        twoFactor: null,
    };

    const password: IAuthPassword = {
        passwordHash: 'hashed',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation(key => configValues[key]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserImportDomain,
                { provide: UserRepository, useValue: userRepository },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: CountryDomain, useValue: countryDomain },
                { provide: UserUtil, useValue: userUtil },
                {
                    provide: UserOnboardingDomain,
                    useValue: userOnboardingDomain,
                },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        domain = module.get(UserImportDomain);
    });

    describe('prepareImportByAdmin', () => {
        const rows = [
            { username: 'thistleRowe', email: 'thistle@example.com' },
            { username: 'marigoldFinch', email: 'marigold@example.com' },
        ];

        beforeEach(() => {
            roleDomain.getByName.mockResolvedValue(role);
            countryDomain.getIdByAlpha2Code.mockResolvedValue(
                'country-thistle'
            );
            userRepository.findByEmails.mockResolvedValue([]);
            userRepository.findByUsernames.mockResolvedValue([]);
            userUtil.checkBadWord.mockResolvedValue(false);
            databaseUtil.createId
                .mockReturnValueOnce('user-id-one')
                .mockReturnValueOnce('user-id-two');
            authPasswordUtil.createPasswordRandom
                .mockReturnValueOnce('password-one')
                .mockReturnValueOnce('password-two');
            authPasswordUtil.createPassword.mockReturnValue(password);
            userOnboardingDomain.buildPersonalWorkspaceContexts.mockReturnValue(
                [
                    {
                        type: EnumUserSignUpWorkspaceContextType.personal,
                        workspaceId: 'workspace-one',
                        slugCandidates: ['w-one'],
                        name: "thistleRowe's Workspace",
                    },
                    {
                        type: EnumUserSignUpWorkspaceContextType.personal,
                        workspaceId: 'workspace-two',
                        slugCandidates: ['w-two'],
                        name: "marigoldFinch's Workspace",
                    },
                ]
            );
        });

        it('builds the import inputs for every row', async () => {
            const result = await domain.prepareImportByAdmin(
                rows,
                'admin-thistle'
            );

            expect(result.inputs).toHaveLength(2);
            expect(result.inputs[0]).toMatchObject({
                userId: 'user-id-one',
                email: 'thistle@example.com',
                username: 'thistleRowe',
                countryId: 'country-thistle',
                roleId: role.id,
                signUpFrom: EnumUserSignUpFrom.admin,
                signUpWith: EnumUserSignUpWith.credential,
                isVerified: false,
                password,
                verification: null,
                createdBy: 'admin-thistle',
            });
            expect(result.passwordHasheds).toEqual([password, password]);
            expect(result.passwordStrings).toEqual([
                'password-one',
                'password-two',
            ]);
        });

        it('marks accounts verified when the default role is not plain user', async () => {
            roleDomain.getByName.mockResolvedValue({
                ...role,
                type: EnumRoleType.admin,
            });

            const result = await domain.prepareImportByAdmin(
                rows,
                'admin-thistle'
            );

            expect(result.inputs[0].isVerified).toBe(true);
        });

        it('throws UserImportEmailExistException when an email already exists', async () => {
            userRepository.findByEmails.mockResolvedValue([
                { ...baseUser, email: 'thistle@example.com' },
            ]);

            await expect(
                domain.prepareImportByAdmin(rows, 'admin-thistle')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.importEmailExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.importEmailExist
                    ],
                messagePath: 'user.error.importEmailExist',
                messageProperties: { emails: 'thistle@example.com' },
            });
        });

        it('throws RoleNotFoundException when the default role is missing', async () => {
            roleDomain.getByName.mockResolvedValue(null);

            const call = domain.prepareImportByAdmin(rows, 'admin-thistle');

            await expect(call).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.notFound],
                messagePath: 'role.error.notFound',
            });
        });

        it('throws CountryNotFoundException when the default country is missing', async () => {
            countryDomain.getIdByAlpha2Code.mockResolvedValue(null);

            const call = domain.prepareImportByAdmin(rows, 'admin-thistle');

            await expect(call).rejects.toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
                statusCodeKey:
                    EnumCountryStatusCodeError[
                        EnumCountryStatusCodeError.notFound
                    ],
                messagePath: 'country.error.notFound',
            });
        });

        it('throws UserImportUsernameExistException when a username already exists', async () => {
            userRepository.findByUsernames.mockResolvedValue([
                { ...baseUser, username: 'thistleRowe' },
            ]);

            await expect(
                domain.prepareImportByAdmin(rows, 'admin-thistle')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.importUsernameExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.importUsernameExist
                    ],
                messagePath: 'user.error.importUsernameExist',
                messageProperties: { usernames: 'thistleRowe' },
            });
        });

        it('throws UserImportUsernameExistException when two rows repeat the same username', async () => {
            const duplicateRows = [
                { username: 'thistleRowe', email: 'thistle@example.com' },
                { username: 'thistleRowe', email: 'other@example.com' },
            ];

            const call = domain.prepareImportByAdmin(
                duplicateRows,
                'admin-thistle'
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.importUsernameExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.importUsernameExist
                    ],
                messagePath: 'user.error.importUsernameExist',
                messageProperties: { usernames: 'thistleRowe' },
            });
        });

        it('throws UserUsernameContainBadWordException when a username is profane', async () => {
            userUtil.checkBadWord.mockResolvedValueOnce(true);

            const call = domain.prepareImportByAdmin(rows, 'admin-thistle');

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameContainBadWord,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameContainBadWord
                    ],
                messagePath: 'user.error.usernameContainBadWord',
            });
        });
    });

    describe('notifyImported', () => {
        it('sends the welcome notification for every imported user', async () => {
            const users = [
                { ...baseUser, id: 'user-id-one' },
                { ...baseUser, id: 'user-id-two', username: 'marigoldFinch' },
            ];
            const passwordHasheds: IAuthPassword[] = [password, password];
            const passwordStrings = ['password-one', 'password-two'];
            helperDateService.formatToIso.mockImplementation(date =>
                date.toISOString()
            );

            await domain.notifyImported(
                users,
                passwordHasheds,
                passwordStrings,
                'admin-thistle'
            );

            expect(
                notificationQueue.sendWelcomeByAdmin
            ).toHaveBeenNthCalledWith(
                1,
                'user-id-one',
                {
                    password: 'password-one',
                    passwordCreatedAt: password.passwordCreated.toISOString(),
                    passwordExpiredAt: password.passwordExpired.toISOString(),
                },
                'admin-thistle'
            );
            expect(
                notificationQueue.sendWelcomeByAdmin
            ).toHaveBeenNthCalledWith(
                2,
                'user-id-two',
                {
                    password: 'password-two',
                    passwordCreatedAt: password.passwordCreated.toISOString(),
                    passwordExpiredAt: password.passwordExpired.toISOString(),
                },
                'admin-thistle'
            );
        });
    });

    describe('exportByAdmin', () => {
        it('returns the exported users when under the max data export', async () => {
            const users = [{ ...baseUser, id: 'user-export-one' }];
            userRepository.findExport.mockResolvedValue(users);

            const result = await domain.exportByAdmin();

            expect(result).toBe(users);
            expect(userRepository.findExport).toHaveBeenCalledWith(
                null,
                null,
                null,
                3
            );
        });

        it('passes the provided filters through', async () => {
            userRepository.findExport.mockResolvedValue([]);
            const status = { status: { in: ['active'] } };
            const roleId = { roleId: { equals: 'role-thistle' } };
            const countryId = { countryId: { equals: 'country-thistle' } };

            await domain.exportByAdmin(status, roleId, countryId);

            expect(userRepository.findExport).toHaveBeenCalledWith(
                status,
                roleId,
                countryId,
                3
            );
        });

        it('throws FileExceedMaxDataExportException when the row count exceeds the maximum', async () => {
            const users = [
                { ...baseUser, id: 'user-export-one' },
                { ...baseUser, id: 'user-export-two' },
                { ...baseUser, id: 'user-export-three' },
            ];
            userRepository.findExport.mockResolvedValue(users);

            await expect(domain.exportByAdmin()).rejects.toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.exceedMaxDataExport,
                statusCodeKey:
                    EnumFileStatusCodeError[
                        EnumFileStatusCodeError.exceedMaxDataExport
                    ],
                messagePath: 'file.error.exceedMaxDataExport',
            });
        });
    });
});
