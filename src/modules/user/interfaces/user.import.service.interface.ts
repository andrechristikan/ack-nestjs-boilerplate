import {
    IPaginationEqual,
    IPaginationIn,
} from '@common/pagination/interfaces/pagination.interface';
import { IUser, IUserImportRow } from '@modules/user/interfaces/user.interface';

export interface IUserImportService {
    importByAdmin(data: IUserImportRow[], createdBy: string): Promise<void>;
    exportByAdmin(
        status?: Record<string, IPaginationIn>,
        roleId?: Record<string, IPaginationEqual>,
        countryId?: Record<string, IPaginationEqual>
    ): Promise<IUser[]>;
}
