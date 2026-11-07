import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { FileService } from '@common/file/services/file.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponseFileReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import { UserDefaultStatus } from '@modules/user/constants/user.list.constant';
import type { UserExportRequestDto } from '@modules/user/dtos/request/user.export.request.dto';
import type { UserExportResponseDto } from '@modules/user/dtos/response/user.export.response.dto';
import { UserImportService } from '@modules/user/services/user.import.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserExportByAdminUseCase implements IAppUseCase<
    [UserExportRequestDto],
    IResponseFileReturn
> {
    constructor(
        private readonly userImportService: UserImportService,
        private readonly fileService: FileService,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(query: UserExportRequestDto): Promise<IResponseFileReturn> {
        const status = this.paginationFilterUtil.inEnum(
            Prisma.UserScalarFieldEnum.status,
            query.status,
            UserDefaultStatus
        );
        const roleId = this.paginationFilterUtil.equalString(
            Prisma.UserScalarFieldEnum.roleId,
            query.roleId
        );
        const countryId = this.paginationFilterUtil.equalString(
            Prisma.UserScalarFieldEnum.countryId,
            query.countryId
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            filters: {
                ...(status?.storeFilter ?? {}),
                ...(roleId?.storeFilter ?? {}),
                ...(countryId?.storeFilter ?? {}),
            },
        });

        const data = await this.userImportService.exportByAdmin(
            status?.where ?? null,
            roleId?.where ?? null,
            countryId?.where ?? null
        );

        const users: UserExportResponseDto[] = data.map(user => ({
            id: user.id,
            createdAt: user.createdAt,
            createdBy: user.createdBy,
            updatedAt: user.updatedAt,
            updatedBy: user.updatedBy,
            deletedAt: user.deletedAt,
            deletedBy: user.deletedBy,
            name: user.name,
            username: user.username as Lowercase<string>,
            isVerified: user.isVerified,
            verifiedAt: user.verifiedAt,
            email: user.email as Lowercase<string>,
            roleId: user.roleId,
            status: user.status,
            countryId: user.countryId,
            photo: user.photo?.completedUrl ?? null,
            role: user.role.name,
        }));

        const csv = this.fileService.writeCsv<UserExportResponseDto>(users);

        return {
            data: csv,
            extension: EnumFileExtensionDocument.csv,
        };
    }
}
