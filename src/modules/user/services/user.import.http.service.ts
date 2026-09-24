import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { FileService } from '@common/file/services/file.service';
import type {
    IPaginationEqual,
    IPaginationIn,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponseFileReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import { UserDefaultStatus } from '@modules/user/constants/user.list.constant';
import type { UserExportRequestDto } from '@modules/user/dtos/request/user.export.request.dto';
import type { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';
import type { UserExportResponseDto } from '@modules/user/dtos/response/user.export.response.dto';
import { EnumUserCreateMode } from '@modules/user/enums/user.enum';
import { UserImportDomain } from '@modules/user/domains/user.import.domain';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserImportHttpService {
    constructor(
        private readonly userImportDomain: UserImportDomain,
        private readonly userOnboardingDomain: UserOnboardingDomain,
        private readonly workspaceDomain: WorkspaceDomain,
        private readonly fileService: FileService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async importByAdmin(
        data: UserImportRequestDto[],
        createdBy: string
    ): Promise<void> {
        const { inputs, passwordHasheds, passwordStrings } =
            await this.userImportDomain.prepareImportByAdmin(
                data.map(({ email, name, username }) => ({
                    email,
                    name,
                    username,
                })),
                createdBy
            );
        const createBulkTimeoutInMs =
            this.userOnboardingDomain.getCreateBulkTimeoutInMs();
        const users = await this.workspaceDomain.commitOnboarding(
            inputs,
            EnumUserCreateMode.admin,
            createBulkTimeoutInMs,
            EnumActivityLogAction.adminUserImport
        );
        await this.userImportDomain.notifyImported(
            users,
            passwordHasheds,
            passwordStrings,
            createdBy
        );
    }

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
            status?.where as Record<string, IPaginationIn> | undefined,
            roleId?.where as Record<string, IPaginationEqual> | undefined,
            countryId?.where as Record<string, IPaginationEqual> | undefined
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
            termPolicyTermsOfService: user.termsOfServiceAccepted,
            termPolicyPrivacy: user.privacyAccepted,
            termPolicyCookies: user.cookiesAccepted,
            termPolicyMarketing: user.marketingAccepted,
            role: user.role.name,
        }));

        const csv = this.fileService.writeCsv<UserExportResponseDto>(users);

        return {
            data: csv,
            extension: EnumFileExtensionDocument.csv,
        };
    }
}
