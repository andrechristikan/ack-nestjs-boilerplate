import {
    IPaginationEqual,
    IPaginationIn,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponseFileReturn } from '@common/response/interfaces/response.interface';
import { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';

export interface IUserImportHttpService {
    importByAdmin(
        data: UserImportRequestDto[],
        createdBy: string
    ): Promise<void>;
    exportByAdmin(
        status?: Record<string, IPaginationIn>,
        roleId?: Record<string, IPaginationEqual>,
        countryId?: Record<string, IPaginationEqual>
    ): Promise<IResponseFileReturn>;
}
