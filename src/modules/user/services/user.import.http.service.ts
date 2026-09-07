import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { FileService } from '@common/file/services/file.service';
import {
    IPaginationEqual,
    IPaginationIn,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponseFileReturn } from '@common/response/interfaces/response.interface';
import { EnumTermPolicyType } from '@generated/prisma-client';
import { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';
import { UserExportResponseDto } from '@modules/user/dtos/response/user.export.response.dto';
import { IUserImportHttpService } from '@modules/user/interfaces/user.import.http.service.interface';
import { UserImportService } from '@modules/user/services/user.import.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserImportHttpService implements IUserImportHttpService {
    constructor(
        private readonly userImportService: UserImportService,
        private readonly fileService: FileService
    ) {}

    async importByAdmin(
        data: UserImportRequestDto[],
        createdBy: string
    ): Promise<void> {
        await this.userImportService.importByAdmin(
            data.map(({ email, name, username }) => ({
                email,
                name,
                username,
            })),
            createdBy
        );
    }

    async exportByAdmin(
        status?: Record<string, IPaginationIn>,
        roleId?: Record<string, IPaginationEqual>,
        countryId?: Record<string, IPaginationEqual>
    ): Promise<IResponseFileReturn> {
        const data = await this.userImportService.exportByAdmin(
            status,
            roleId,
            countryId
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
            termPolicyTermsOfService:
                user.termPolicy[EnumTermPolicyType.termsOfService],
            termPolicyPrivacy: user.termPolicy[EnumTermPolicyType.privacy],
            termPolicyCookies: user.termPolicy[EnumTermPolicyType.cookies],
            termPolicyMarketing: user.termPolicy[EnumTermPolicyType.marketing],
            role: user.role.name,
        }));

        return {
            data: this.fileService.writeCsv<UserExportResponseDto>(users),
            extension: EnumFileExtensionDocument.csv,
        };
    }
}
