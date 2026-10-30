import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { FileService } from '@common/file/services/file.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponseFileReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import { UserDefaultStatus } from '@modules/user/constants/user.list.constant';
import type { UserExportRequestDto } from '@modules/user/dtos/request/user.export.request.dto';
import type { UserExportResponseDto } from '@modules/user/dtos/response/user.export.response.dto';
import { UserImportDomain } from '@modules/user/domains/user.import.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserExportHttpService {
    constructor(
        private readonly userImportDomain: UserImportDomain,
        private readonly fileService: FileService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async exportByAdmin(
        query: UserExportRequestDto
    ): Promise<IResponseFileReturn> {
        const status = this.paginationQueryUtil.inEnum(
            Prisma.UserScalarFieldEnum.status,
            query.status,
            UserDefaultStatus
        );
        const roleId = this.paginationQueryUtil.equalString(
            Prisma.UserScalarFieldEnum.roleId,
            query.roleId
        );
        const countryId = this.paginationQueryUtil.equalString(
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

        const data = await this.userImportDomain.exportByAdmin(
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
