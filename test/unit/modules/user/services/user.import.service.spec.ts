import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import type { IActivityLogInput } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { UserImportService } from '@modules/user/services/user.import.service';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserImportUsernameChecks,
} from '@modules/user/interfaces/user.interface';
import type { IUserCreateVerification } from '@modules/user/interfaces/user.create.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';

describe('UserImportService', () => {
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userCreateUtil: MockProxy<UserCreateUtil> = mock<UserCreateUtil>();
    const userVerificationUtil: MockProxy<UserVerificationUtil> =
        mock<UserVerificationUtil>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let service: UserImportService;

    const configValues: Record<string, string | number> = {
        'user.default.role': 'user',
        'user.default.country': 'US',
        'user.maxDataExport': 2,
    };

    const role: IRole = {
        id: 'role-thistle',
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.user,
        policyRevision: 0,
        name: 'user',
        description: null,
        isImmutable: false,
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
        passwordLockedUntil: null,
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
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: { ...role },
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
                UserImportService,
                { provide: UserRepository, useValue: userRepository },
                { provide: UserUtil, useValue: userUtil },
                { provide: UserCreateUtil, useValue: userCreateUtil },
                {
                    provide: UserVerificationUtil,
                    useValue: userVerificationUtil,
                },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        service = module.get(UserImportService);
    });

    describe('prepareImportByAdmin', () => {
        const rows = [
            {
                username: 'thistleRowe',
                email: 'thistle@example.com',
                name: null,
            },
            {
                username: 'marigoldFinch',
                email: 'marigold@example.com',
                name: null,
            },
        ];

        const verifiedOne: IUserCreateVerification = {
            reference: 'ref-one',
            token: 'hashed-token-one',
            type: EnumVerificationType.email,
            action: null,
            mobileNumberId: null,
            to: 'thistle@example.com',
            expiredAt: new Date('2026-02-01T00:00:00.000Z'),
            verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
            isUsed: true,
        };
        const verifiedTwo: IUserCreateVerification = {
            ...verifiedOne,
            reference: 'ref-two',
            token: 'hashed-token-two',
            to: 'marigold@example.com',
        };

        beforeEach(() => {
            databaseUtil.createId
                .mockReturnValueOnce('user-id-one')
                .mockReturnValueOnce('user-id-two');
            authPasswordUtil.createPasswordRandom
                .mockReturnValueOnce('password-one')
                .mockReturnValueOnce('password-two');
            authPasswordUtil.createPassword.mockResolvedValue(password);
            userCreateUtil.buildPersonalWorkspaceContexts.mockReturnValue([
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
            ]);
            userVerificationUtil.createVerified
                .mockReturnValueOnce(verifiedOne)
                .mockReturnValueOnce(verifiedTwo);
        });

        it('builds the import inputs for every row', async () => {
            const result = await service.prepareImportByAdmin(
                rows,
                'admin-thistle',
                role,
                'country-thistle'
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
                password,
                createdBy: 'admin-thistle',
            });
            expect(result.passwordHasheds).toEqual([password, password]);
            expect(result.passwordStrings).toEqual([
                'password-one',
                'password-two',
            ]);
        });

        it('creates every imported user verified at the verification time with a used verification row', async () => {
            const result = await service.prepareImportByAdmin(
                rows,
                'admin-thistle',
                role,
                'country-thistle'
            );

            expect(userVerificationUtil.createVerified).toHaveBeenCalledTimes(
                2
            );
            expect(userVerificationUtil.createVerified).toHaveBeenNthCalledWith(
                1,
                'thistle@example.com'
            );
            expect(userVerificationUtil.createVerified).toHaveBeenNthCalledWith(
                2,
                'marigold@example.com'
            );
            expect(result.inputs[0]).toMatchObject({
                isVerified: true,
                verifiedAt: verifiedOne.verifiedAt,
                verification: verifiedOne,
            });
            expect(result.inputs[1]).toMatchObject({
                isVerified: true,
                verifiedAt: verifiedTwo.verifiedAt,
                verification: verifiedTwo,
            });
        });

        it('hashes every generated password as a temporary one', async () => {
            await service.prepareImportByAdmin(
                rows,
                'admin-thistle',
                role,
                'country-thistle'
            );

            expect(authPasswordUtil.createPassword).toHaveBeenCalledTimes(2);
            expect(authPasswordUtil.createPassword).toHaveBeenNthCalledWith(
                1,
                'password-one',
                { temporary: true }
            );
            expect(authPasswordUtil.createPassword).toHaveBeenNthCalledWith(
                2,
                'password-two',
                { temporary: true }
            );
        });

        it('starts every hash before the first resolves and keeps row order', async () => {
            const first = Promise.withResolvers<typeof password>();
            const second = { ...password, passwordHash: 'hash-second' };
            authPasswordUtil.createPassword
                .mockReturnValueOnce(first.promise)
                .mockResolvedValueOnce(second);

            const pending = service.prepareImportByAdmin(
                rows,
                'admin-thistle',
                role,
                'country-thistle'
            );
            await Promise.resolve();

            expect(authPasswordUtil.createPassword).toHaveBeenCalledTimes(2);
            expect(authPasswordUtil.createPassword).toHaveBeenNthCalledWith(
                2,
                'password-two',
                { temporary: true }
            );

            first.resolve(password);
            const result = await pending;

            expect(result.passwordHasheds[0]).toBe(password);
            expect(result.passwordHasheds[1]).toBe(second);
        });
    });

    describe('assertImportByAdminRows', () => {
        const rows = [
            {
                username: 'thistleRowe',
                email: 'thistle@example.com',
                name: null,
            },
            {
                username: 'marigoldFinch',
                email: 'marigold@example.com',
                name: null,
            },
        ];
        const clearChecks: IUserImportUsernameChecks = {
            existing: [],
            badWords: [false, false],
        };

        it('passes when no row repeats, no username exists, and no username is profane', () => {
            expect(() =>
                service.assertImportByAdminRows(rows, clearChecks)
            ).not.toThrow();
        });

        it('throws UserImportEmailExistException when two rows repeat the same email', () => {
            const duplicateRows = [
                rows[0]!,
                { ...rows[1]!, email: 'thistle@example.com' },
            ];

            expect(() =>
                service.assertImportByAdminRows(duplicateRows, clearChecks)
            ).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.importEmailExist,
                    statusCodeKey:
                        EnumUserStatusCodeError[
                            EnumUserStatusCodeError.importEmailExist
                        ],
                    messagePath: 'user.error.importEmailExist',
                    messageProperties: { emails: 'thistle@example.com' },
                })
            );
        });

        it('throws UserImportUsernameExistException when a username already exists', () => {
            expect(() =>
                service.assertImportByAdminRows(rows, {
                    ...clearChecks,
                    existing: ['thistleRowe'],
                })
            ).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.importUsernameExist,
                    statusCodeKey:
                        EnumUserStatusCodeError[
                            EnumUserStatusCodeError.importUsernameExist
                        ],
                    messagePath: 'user.error.importUsernameExist',
                    messageProperties: { usernames: 'thistleRowe' },
                })
            );
        });

        it('throws UserImportUsernameExistException when two rows repeat the same username', () => {
            const duplicateRows = [
                rows[0]!,
                { ...rows[1]!, username: 'thistleRowe' },
            ];

            expect(() =>
                service.assertImportByAdminRows(duplicateRows, clearChecks)
            ).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.importUsernameExist,
                    messagePath: 'user.error.importUsernameExist',
                    messageProperties: { usernames: 'thistleRowe' },
                })
            );
        });

        it('throws UserUsernameContainBadWordException when a username is profane', () => {
            expect(() =>
                service.assertImportByAdminRows(rows, {
                    ...clearChecks,
                    badWords: [true, false],
                })
            ).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.usernameContainBadWord,
                    statusCodeKey:
                        EnumUserStatusCodeError[
                            EnumUserStatusCodeError.usernameContainBadWord
                        ],
                    messagePath: 'user.error.usernameContainBadWord',
                })
            );
        });

        it('throws the duplicate email error before the existing username error', () => {
            const duplicateRows = [
                rows[0]!,
                { ...rows[1]!, email: 'thistle@example.com' },
            ];

            expect(() =>
                service.assertImportByAdminRows(duplicateRows, {
                    ...clearChecks,
                    existing: ['thistleRowe'],
                })
            ).toThrow(
                expect.objectContaining({
                    statusCode: EnumUserStatusCodeError.importEmailExist,
                })
            );
        });

        it('throws the existing username error before the duplicate username and bad-word errors', () => {
            const duplicateRows = [
                rows[0]!,
                { ...rows[1]!, username: 'thistleRowe' },
            ];

            expect(() =>
                service.assertImportByAdminRows(duplicateRows, {
                    existing: ['marigoldFinch'],
                    badWords: [true, true],
                })
            ).toThrow(
                expect.objectContaining({
                    statusCode: EnumUserStatusCodeError.importUsernameExist,
                    messageProperties: { usernames: 'marigoldFinch' },
                })
            );
        });
    });

    describe('getExistingEmails', () => {
        it('answers the listed emails that already exist', async () => {
            userRepository.findByEmails.mockResolvedValue([
                { ...baseUser, email: 'thistle@example.com' },
            ]);

            await expect(
                service.getExistingEmails([
                    'thistle@example.com',
                    'marigold@example.com',
                ])
            ).resolves.toEqual(['thistle@example.com']);
            expect(userRepository.findByEmails).toHaveBeenCalledWith([
                'thistle@example.com',
                'marigold@example.com',
            ]);
        });
    });

    describe('assertEmailsAvailable', () => {
        it('passes when no listed email exists', () => {
            expect(() => service.assertEmailsAvailable([])).not.toThrow();
        });

        it('throws UserImportEmailExistException naming every existing email', () => {
            expect(() =>
                service.assertEmailsAvailable([
                    'thistle@example.com',
                    'marigold@example.com',
                ])
            ).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.importEmailExist,
                    statusCodeKey:
                        EnumUserStatusCodeError[
                            EnumUserStatusCodeError.importEmailExist
                        ],
                    messagePath: 'user.error.importEmailExist',
                    messageProperties: {
                        emails: 'thistle@example.com, marigold@example.com',
                    },
                })
            );
        });
    });

    describe('getUsernameChecks', () => {
        it('reads the existing usernames and the bad-word check of every username', async () => {
            userRepository.findByUsernames.mockResolvedValue([
                { ...baseUser, username: 'thistleRowe' },
            ]);
            userUtil.hasBadWord
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(true);

            await expect(
                service.getUsernameChecks(['thistleRowe', 'marigoldFinch'])
            ).resolves.toEqual({
                existing: ['thistleRowe'],
                badWords: [false, true],
            });
            expect(userRepository.findByUsernames).toHaveBeenCalledWith([
                'thistleRowe',
                'marigoldFinch',
            ]);
        });
    });

    describe('exportByAdmin', () => {
        it('returns the exported users when under the max data export', async () => {
            const users = [{ ...baseUser, id: 'user-export-one' }];
            userRepository.findExport.mockResolvedValue(users);

            const result = await service.exportByAdmin(null, null, null, null);

            expect(result).toBe(users);
            expect(userRepository.findExport).toHaveBeenCalledWith(
                null,
                null,
                null,
                3,
                null
            );
        });

        it('passes the provided filters through', async () => {
            userRepository.findExport.mockResolvedValue([]);
            const status = { status: { in: ['active'] } };
            const roleId = { roleId: { equals: 'role-thistle' } };
            const countryId = { countryId: { equals: 'country-thistle' } };

            await service.exportByAdmin(status, roleId, countryId, null);

            expect(userRepository.findExport).toHaveBeenCalledWith(
                status,
                roleId,
                countryId,
                3,
                null
            );
        });

        it('throws FileExceedMaxDataExportException when the row count exceeds the maximum', async () => {
            const users = [
                { ...baseUser, id: 'user-export-one' },
                { ...baseUser, id: 'user-export-two' },
                { ...baseUser, id: 'user-export-three' },
            ];
            userRepository.findExport.mockResolvedValue(users);

            await expect(
                service.exportByAdmin(null, null, null, null)
            ).rejects.toMatchObject({
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

    describe('buildImportByAdminStages', () => {
        it('leads with the adminUserImport row carrying the user count, then every input rows', () => {
            const input: IUserCreateWithWorkspaceInput = {
                userId: baseUser.id,
                email: baseUser.email,
                name: baseUser.name,
                username: baseUser.username,
                countryId: baseUser.countryId,
                roleId: role.id,
                signUpFrom: EnumUserSignUpFrom.admin,
                signUpWith: EnumUserSignUpWith.credential,
                isVerified: true,
                verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
                acceptedTermPolicyTypes: [],
                password,
                passwordHistoryType: null,
                verification: null,
                workspaceContext: {
                    type: EnumUserSignUpWorkspaceContextType.personal,
                    workspaceId: 'workspace-thistle',
                    slugCandidates: ['w-thistle'],
                    name: "thistleRowe's Workspace",
                },
                createdBy: 'admin-thistle',
            };
            const second: IUser = { ...baseUser, id: 'user-second' };
            const secondInput: IUserCreateWithWorkspaceInput = {
                ...input,
                userId: second.id,
            };
            const contractStages: IActivityLogInput<EnumActivityLogAction>[] = [
                {
                    action: UserCreateContract.admin.createdAction,
                    userId: baseUser.id,
                    createdBy: 'admin-thistle',
                    metadata: {},
                },
                {
                    action: UserCreateContract.admin.createdAction,
                    userId: second.id,
                    createdBy: 'admin-thistle',
                    metadata: {},
                },
            ];
            userCreateUtil.buildStages.mockReturnValue(contractStages);

            const result = service.buildImportByAdminStages(
                [input, secondInput],
                [baseUser, second]
            );

            expect(userCreateUtil.buildStages).toHaveBeenCalledWith(
                UserCreateContract.admin,
                [input, secondInput],
                [baseUser, second]
            );
            expect(result).toEqual([
                {
                    action: EnumActivityLogAction.adminUserImport,
                    metadata: { userCount: 2 },
                },
                ...contractStages,
            ]);
        });
    });
});
