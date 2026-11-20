import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumAwsS3Accessibility,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { FileService } from '@common/file/services/file.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { UserImportService } from '@modules/user/services/user.import.service';
import type { UserExportRequestDto } from '@modules/user/dtos/request/user.export.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserExportByAdminUseCase } from '@modules/user/use-cases/user.export-by-admin.use-case';
import { buildUser } from '@test/unit/helpers/test.unit.request.helper';

describe('UserExportByAdminUseCase', () => {
    const userImportService: MockProxy<UserImportService> =
        mock<UserImportService>();
    const fileService: MockProxy<FileService> = mock<FileService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let useCase: UserExportByAdminUseCase;

    const baseUser: IUser = buildUser('user-fable', 'fable@example.com');

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserExportByAdminUseCase,
                { provide: UserImportService, useValue: userImportService },
                { provide: FileService, useValue: fileService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
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
            const user = {
                ...baseUser,
                photo: {
                    bucket: 'bucket',
                    key: 'photo.png',
                    cdnUrl: null,
                    completedUrl: 'https://cdn.example.com/photo.png',
                    mime: 'image/png',
                    extension: 'png',
                    access: EnumAwsS3Accessibility.public,
                },
            };
            userImportService.exportByAdmin.mockResolvedValue([user]);
            fileService.writeCsv.mockReturnValue('csv-content');

            const result = await useCase.execute({
                status: EnumUserStatus.active,
                roleId: 'role-fable',
                countryId: 'country-fable',
            });

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

        it('applies no filter and exports a missing photo as null when no filter or photo is given', async () => {
            const user = { ...baseUser, photo: null };
            userImportService.exportByAdmin.mockResolvedValue([user]);
            fileService.writeCsv.mockReturnValue('csv-content');

            await useCase.execute(query);

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
