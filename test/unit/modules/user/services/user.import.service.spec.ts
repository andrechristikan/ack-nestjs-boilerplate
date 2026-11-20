import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
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
import type { MockInstance } from 'vitest';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitUserConfigValues } from '@test/unit/helpers/test.unit.user.helper';
import type { IUserCreateVerification } from '@modules/user/interfaces/user.create.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { buildUser } from '@test/unit/helpers/test.unit.request.helper';

describe('UserImportService', () => {
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();

    const now = new Date('2026-03-01T00:00:00.000Z');
    const password = {
        passwordHash: 'hashed',
        passwordExpired: new Date('2026-03-01T01:00:00.000Z'),
        passwordCreated: now,
        passwordPeriodExpired: new Date('2026-05-30T00:00:00.000Z'),
    };
    let service: UserImportService;
    let databaseUtil: DatabaseUtil;
    let helperStringService: HelperStringService;
    let helperHashService: HelperHashService;

    const configValues: Record<string, unknown> = {
        ...TestUnitUserConfigValues,
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

    const baseUser: IUser = buildUser('user-thistle', 'thistle@example.com');

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        vi.setSystemTime(now);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserImportService,
                { provide: UserRepository, useValue: userRepository },
                UserUtil,
                UserCreateUtil,
                UserVerificationUtil,
                AuthPasswordUtil,
                DatabaseUtil,
                HelperDateService,
                HelperStringService,
                HelperHashService,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(configValues),
                },
            ],
        }).compile();
        service = module.get(UserImportService);
        databaseUtil = module.get(DatabaseUtil);
        helperStringService = module.get(HelperStringService);
        helperHashService = module.get(HelperHashService);
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
            reference: 'VRF-ref-one',
            token: '75c5c10f256c75b650c6ffc2e83c6588af02766efd2de28f4de34547006e8d1a',
            type: EnumVerificationType.email,
            action: null,
            mobileNumberId: null,
            to: 'thistle@example.com',
            expiredAt: new Date('2026-03-01T00:15:00.000Z'),
            verifiedAt: now,
            isUsed: true,
        };
        const verifiedTwo: IUserCreateVerification = {
            ...verifiedOne,
            reference: 'VRF-ref-two',
            token: 'adb97ffd599d30b788077856502e55d9ef5543386cd60a5106e034ebbc3acb0c',
            to: 'marigold@example.com',
        };
        let argon2Hash: MockInstance<HelperHashService['argon2Hash']>;

        beforeEach(() => {
            vi.spyOn(databaseUtil, 'createId')
                .mockReturnValueOnce('user-id-one')
                .mockReturnValueOnce('user-id-two')
                .mockReturnValueOnce('workspace-one')
                .mockReturnValueOnce('workspace-two');
            vi.spyOn(helperStringService, 'random')
                .mockReturnValueOnce('password-one')
                .mockReturnValueOnce('password-two')
                .mockReturnValueOnce('one-a')
                .mockReturnValueOnce('one-b')
                .mockReturnValueOnce('one-c')
                .mockReturnValueOnce('two-a')
                .mockReturnValueOnce('two-b')
                .mockReturnValueOnce('two-c')
                .mockReturnValueOnce('token-one')
                .mockReturnValueOnce('ref-one')
                .mockReturnValueOnce('token-two')
                .mockReturnValueOnce('ref-two');
            argon2Hash = vi
                .spyOn(helperHashService, 'argon2Hash')
                .mockResolvedValue('hashed');
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

            expect(argon2Hash).toHaveBeenCalledTimes(2);
            expect(argon2Hash).toHaveBeenNthCalledWith(1, 'password-one');
            expect(argon2Hash).toHaveBeenNthCalledWith(2, 'password-two');
        });

        it('starts every hash before the first resolves and keeps row order', async () => {
            const first = Promise.withResolvers<string>();
            argon2Hash
                .mockReturnValueOnce(first.promise)
                .mockResolvedValueOnce('hash-second');

            const pending = service.prepareImportByAdmin(
                rows,
                'admin-thistle',
                role,
                'country-thistle'
            );
            await Promise.resolve();

            expect(argon2Hash).toHaveBeenCalledTimes(2);
            expect(argon2Hash).toHaveBeenNthCalledWith(2, 'password-two');

            first.resolve('hash-first');
            const result = await pending;

            expect(result.passwordHasheds[0]?.passwordHash).toBe('hash-first');
            expect(result.passwordHasheds[1]?.passwordHash).toBe('hash-second');
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
            await expect(
                service.getUsernameChecks(['thistleRowe', 'damn'])
            ).resolves.toEqual({
                existing: ['thistleRowe'],
                badWords: [false, true],
            });
            expect(userRepository.findByUsernames).toHaveBeenCalledWith([
                'thistleRowe',
                'damn',
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
            const result = service.buildImportByAdminStages(
                [input, secondInput],
                [baseUser, second]
            );

            expect(result).toEqual([
                {
                    action: EnumActivityLogAction.adminUserImport,
                    metadata: { userCount: 2 },
                },
                {
                    action: UserCreateContract.admin.createdAction,
                    userId: baseUser.id,
                    createdBy: 'admin-thistle',
                    metadata: {
                        actorUserId: 'admin-thistle',
                        timestamp: baseUser.createdAt,
                    },
                },
                {
                    action: EnumActivityLogAction.workspaceCreatedByAdmin,
                    userId: baseUser.id,
                    createdBy: 'admin-thistle',
                    workspaceId: 'workspace-thistle',
                    metadata: { actorUserId: 'admin-thistle' },
                },
                {
                    action: UserCreateContract.admin.createdAction,
                    userId: second.id,
                    createdBy: 'admin-thistle',
                    metadata: {
                        actorUserId: 'admin-thistle',
                        timestamp: baseUser.createdAt,
                    },
                },
                {
                    action: EnumActivityLogAction.workspaceCreatedByAdmin,
                    userId: second.id,
                    createdBy: 'admin-thistle',
                    workspaceId: 'workspace-thistle',
                    metadata: { actorUserId: 'admin-thistle' },
                },
            ]);
        });
    });
});
