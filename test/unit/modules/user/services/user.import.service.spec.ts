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
    EnumVerificationType,
} from '@generated/prisma-client/client';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { UserImportService } from '@modules/user/services/user.import.service';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type {
    IUser,
    IUserImportUsernameChecks,
} from '@modules/user/interfaces/user.interface';
import type { IUserCreateVerification } from '@modules/user/interfaces/user.create.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';

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
        type: EnumRoleType.user,
        isImmutable: false,
        name: 'user',
    };
    const roleWithPolicies: IRoleWithPolicies = {
        id: role.id,
        name: role.name,
        description: null,
        type: role.type,
        isImmutable: false,
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

        const clearChecks: IUserImportUsernameChecks = {
            existing: [],
            badWords: [false, false],
        };
        const verifiedOne: IUserCreateVerification = {
            reference: 'ref-one',
            token: 'hashed-token-one',
            type: EnumVerificationType.email,
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
                'country-thistle',
                clearChecks
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
                'country-thistle',
                clearChecks
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
                'country-thistle',
                clearChecks
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

        it('throws UserImportEmailExistException when two rows repeat the same email', async () => {
            const duplicateRows = [
                {
                    username: 'thistleRowe',
                    email: 'thistle@example.com',
                    name: null,
                },
                {
                    username: 'marigoldFinch',
                    email: 'thistle@example.com',
                    name: null,
                },
            ];

            const call = service.prepareImportByAdmin(
                duplicateRows,
                'admin-thistle',
                role,
                'country-thistle',
                clearChecks
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.importEmailExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.importEmailExist
                    ],
                messagePath: 'user.error.importEmailExist',
                messageProperties: { emails: 'thistle@example.com' },
            });
            expect(authPasswordUtil.createPassword).not.toHaveBeenCalled();
        });

        it('throws UserImportUsernameExistException when a username already exists', async () => {
            await expect(
                service.prepareImportByAdmin(
                    rows,
                    'admin-thistle',
                    role,
                    'country-thistle',
                    { ...clearChecks, existing: ['thistleRowe'] }
                )
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
                {
                    username: 'thistleRowe',
                    email: 'thistle@example.com',
                    name: null,
                },
                {
                    username: 'thistleRowe',
                    email: 'other@example.com',
                    name: null,
                },
            ];

            const call = service.prepareImportByAdmin(
                duplicateRows,
                'admin-thistle',
                role,
                'country-thistle',
                clearChecks
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
            const call = service.prepareImportByAdmin(
                rows,
                'admin-thistle',
                role,
                'country-thistle',
                { ...clearChecks, badWords: [true, false] }
            );

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
            userUtil.checkBadWord
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true);

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

            const result = await service.exportByAdmin(null, null, null);

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

            await service.exportByAdmin(status, roleId, countryId);

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

            await expect(
                service.exportByAdmin(null, null, null)
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
});
