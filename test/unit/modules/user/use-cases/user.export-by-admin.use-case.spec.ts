import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { FileService } from '@common/file/services/file.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { UserDefaultStatus } from '@modules/user/constants/user.list.constant';
import { UserImportService } from '@modules/user/services/user.import.service';
import type { UserExportRequestDto } from '@modules/user/dtos/request/user.export.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserExportByAdminUseCase } from '@modules/user/use-cases/user.export-by-admin.use-case';

describe('UserExportByAdminUseCase', () => {
    const userImportService: MockProxy<UserImportService> =
        mock<UserImportService>();
    const fileService: MockProxy<FileService> = mock<FileService>();
    const paginationFilterUtil: MockProxy<PaginationFilterUtil> =
        mock<PaginationFilterUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let useCase: UserExportByAdminUseCase;

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
            isImmutable: false,
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
                UserExportByAdminUseCase,
                { provide: UserImportService, useValue: userImportService },
                { provide: FileService, useValue: fileService },
                {
                    provide: PaginationFilterUtil,
                    useValue: paginationFilterUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        useCase = module.get(UserExportByAdminUseCase);
    });

    describe('execute', () => {
        const query: UserExportRequestDto = {};

        it('merges every filter into the pagination store and writes a csv', async () => {
            paginationFilterUtil.inEnum.mockReturnValue({
                where: { status: { in: [EnumUserStatus.active] } },
                storeFilter: { status: [EnumUserStatus.active] },
            });
            paginationFilterUtil.equalString
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
            userImportService.exportByAdmin.mockResolvedValue([user]);
            fileService.writeCsv.mockReturnValue('csv-content');

            const result = await useCase.execute(query);

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
            expect(userImportService.exportByAdmin).toHaveBeenCalledWith(
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
            paginationFilterUtil.inEnum.mockReturnValue(null);
            paginationFilterUtil.equalString.mockReturnValue(null);
            const user = { ...baseUser, photo: null };
            userImportService.exportByAdmin.mockResolvedValue([user]);
            fileService.writeCsv.mockReturnValue('csv-content');

            await useCase.execute(query);

            expect(paginationFilterUtil.inEnum).toHaveBeenCalledWith(
                'status',
                query.status,
                UserDefaultStatus
            );
            expect(userImportService.exportByAdmin).toHaveBeenCalledWith(
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
