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
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { UserDefaultStatus } from '@modules/user/constants/user.list.constant';
import { UserImportDomain } from '@modules/user/domains/user.import.domain';
import { UserExportHttpService } from '@modules/user/services/user.export.http.service';
import type { UserExportRequestDto } from '@modules/user/dtos/request/user.export.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('UserExportHttpService', () => {
    const userImportDomain: MockProxy<UserImportDomain> =
        mock<UserImportDomain>();
    const fileService: MockProxy<FileService> = mock<FileService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let service: UserExportHttpService;

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
                UserExportHttpService,
                { provide: UserImportDomain, useValue: userImportDomain },
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
        service = module.get(UserExportHttpService);
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
