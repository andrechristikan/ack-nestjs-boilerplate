import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { FileService } from '@common/file/services/file.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { UserDefaultStatus } from '@modules/user/constants/user.list.constant';
import { UserImportDomain } from '@modules/user/domains/user.import.domain';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { UserImportHttpService } from '@modules/user/services/user.import.http.service';
import { EnumUserCreateMode } from '@modules/user/enums/user.enum';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import type { UserExportRequestDto } from '@modules/user/dtos/request/user.export.request.dto';
import type { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
} from '@modules/user/interfaces/user.interface';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';

describe('UserImportHttpService', () => {
    const userImportDomain: MockProxy<UserImportDomain> =
        mock<UserImportDomain>();
    const userOnboardingDomain: MockProxy<UserOnboardingDomain> =
        mock<UserOnboardingDomain>();
    const workspaceDomain: MockProxy<WorkspaceDomain> = mock<WorkspaceDomain>();
    const fileService: MockProxy<FileService> = mock<FileService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let service: UserImportHttpService;

    const baseUser: IUser = {
        id: 'user-fable',
        name: 'Fable Sterling',
        username: 'fable2sterling',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'fable@example.com',
        roleId: 'role-fable',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.admin,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-fable',
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
        role: {
            id: 'role-fable',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserImportHttpService,
                { provide: UserImportDomain, useValue: userImportDomain },
                {
                    provide: UserOnboardingDomain,
                    useValue: userOnboardingDomain,
                },
                { provide: WorkspaceDomain, useValue: workspaceDomain },
                { provide: FileService, useValue: fileService },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        service = module.get(UserImportHttpService);
    });

    describe('importByAdmin', () => {
        it('prepares, commits and notifies the imported rows', async () => {
            const rows: UserImportRequestDto[] = [
                {
                    email: 'fable@example.com' as Lowercase<string>,
                    name: 'Fable Sterling',
                    username: 'fable2sterling',
                },
            ];
            const input: IUserCreateWithWorkspaceInput = {
                userId: 'user-fable',
                email: rows[0].email,
                name: rows[0].name ?? null,
                username: rows[0].username,
                countryId: 'country-fable',
                roleId: 'role-fable',
                signUpFrom: EnumUserSignUpFrom.admin,
                signUpWith: EnumUserSignUpWith.credential,
                isVerified: false,
                termPolicy: {
                    termsOfService: true,
                    privacy: true,
                    marketing: false,
                    cookies: false,
                },
                acceptedTermPolicyTypes: [],
                password: null,
                passwordHistoryType: null,
                verification: null,
                workspaceContext: {
                    type: EnumUserSignUpWorkspaceContextType.personal,
                    workspaceId: 'workspace-fable',
                    slugCandidates: ['w-fable'],
                    name: "fable2sterling's Workspace",
                },
                createdBy: 'admin-fable',
            };
            const passwordHasheds: IAuthPassword[] = [
                {
                    passwordHash: 'hashed',
                    passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
                    passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
                    passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
                },
            ];
            userImportDomain.prepareImportByAdmin.mockResolvedValue({
                inputs: [input],
                passwordHasheds,
                passwordStrings: ['random-password'],
            });
            userOnboardingDomain.getCreateBulkTimeoutInMs.mockReturnValue(
                30000
            );
            const users = [baseUser];
            workspaceDomain.commitOnboarding.mockResolvedValue(users);

            await service.importByAdmin(rows, 'admin-fable');

            expect(userImportDomain.prepareImportByAdmin).toHaveBeenCalledWith(
                [
                    {
                        email: rows[0].email,
                        name: rows[0].name,
                        username: rows[0].username,
                    },
                ],
                'admin-fable'
            );
            expect(workspaceDomain.commitOnboarding).toHaveBeenCalledWith(
                [input],
                EnumUserCreateMode.admin,
                30000,
                EnumActivityLogAction.adminUserImport
            );
            expect(userImportDomain.notifyImported).toHaveBeenCalledWith(
                users,
                passwordHasheds,
                ['random-password'],
                'admin-fable'
            );
        });
    });

    describe('exportByAdmin', () => {
        const query: UserExportRequestDto = {};

        it('merges every filter into the pagination store and writes a csv', async () => {
            paginationQueryUtil.inEnum.mockReturnValue({
                where: { status: { in: [EnumUserStatus.active] } },
                storeFilter: { status: [EnumUserStatus.active] },
            });
            paginationQueryUtil.equalString
                .mockReturnValueOnce({
                    where: { roleId: { equals: 'role-fable' } },
                    storeFilter: { roleId: 'role-fable' },
                })
                .mockReturnValueOnce({
                    where: { countryId: { equals: 'country-fable' } },
                    storeFilter: { countryId: 'country-fable' },
                });
            const user = {
                ...baseUser,
                photo: {
                    bucket: 'bucket',
                    key: 'photo.png',
                    cdnUrl: null,
                    completedUrl: 'https://cdn.example.com/photo.png',
                    mime: 'image/png',
                    extension: 'png',
                    access: 'public',
                },
            };
            userImportDomain.exportByAdmin.mockResolvedValue([user]);
            fileService.writeCsv.mockReturnValue('csv-content');

            const result = await service.exportByAdmin(query);

            expect(result).toEqual({
                data: 'csv-content',
                extension: EnumFileExtensionDocument.csv,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                expect.objectContaining({
                    filters: expect.objectContaining({
                        status: [EnumUserStatus.active],
                        roleId: 'role-fable',
                        countryId: 'country-fable',
                    }),
                })
            );
            expect(userImportDomain.exportByAdmin).toHaveBeenCalledWith(
                { status: { in: [EnumUserStatus.active] } },
                { roleId: { equals: 'role-fable' } },
                { countryId: { equals: 'country-fable' } }
            );
            expect(fileService.writeCsv).toHaveBeenCalledWith([
                expect.objectContaining({
                    id: user.id,
                    photo: 'https://cdn.example.com/photo.png',
                    role: user.role.name,
                }),
            ]);
        });

        it('defaults the status filter and a missing photo when no filter or photo applies', async () => {
            paginationQueryUtil.inEnum.mockReturnValue(null);
            paginationQueryUtil.equalString.mockReturnValue(null);
            const user = { ...baseUser, photo: null };
            userImportDomain.exportByAdmin.mockResolvedValue([user]);
            fileService.writeCsv.mockReturnValue('csv-content');

            await service.exportByAdmin(query);

            expect(paginationQueryUtil.inEnum).toHaveBeenCalledWith(
                'status',
                query.status,
                UserDefaultStatus
            );
            expect(userImportDomain.exportByAdmin).toHaveBeenCalledWith(
                null,
                null,
                null
            );
            expect(fileService.writeCsv).toHaveBeenCalledWith([
                expect.objectContaining({ photo: null }),
            ]);
        });
    });
});
