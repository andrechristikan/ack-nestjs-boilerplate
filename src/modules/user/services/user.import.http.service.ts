import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { FileService } from '@common/file/services/file.service';
import {
    IPaginationEqual,
    IPaginationIn,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponseFileReturn } from '@common/response/interfaces/response.interface';
import { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';
import { UserExportResponseDto } from '@modules/user/dtos/response/user.export.response.dto';
import { IUserImportHttpService } from '@modules/user/interfaces/user.import.http.service.interface';
import { UserImportService } from '@modules/user/services/user.import.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserImportHttpService implements IUserImportHttpService {
    constructor(
        private readonly userImportService: UserImportService,
        private readonly userUtil: UserUtil,
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

        const users: UserExportResponseDto[] = this.userUtil.mapExport(data);

        return {
            data: this.fileService.writeCsv<UserExportResponseDto>(users),
            extension: EnumFileExtensionDocument.csv,
        };
    }
}
