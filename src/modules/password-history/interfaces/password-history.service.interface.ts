import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { PasswordHistoryCreateByAdminRequestDto } from 'src/modules/password-history/dtos/request/password-history.create-by-admin.request.dto';
import { PasswordHistoryCreateRequestDto } from 'src/modules/password-history/dtos/request/password-history.create.request.dto';
import { PasswordHistoryListResponseDto } from 'src/modules/password-history/dtos/response/password-history.list.response.dto';
import {
    IPasswordHistoryDoc,
    IPasswordHistoryEntity,
} from 'src/modules/password-history/interfaces/password-history.interface';
import { PasswordHistoryDoc } from 'src/modules/password-history/repository/entities/password-history.entity';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';

export interface IPasswordHistoryService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IPasswordHistoryDoc[]>;
    findAllByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IPasswordHistoryDoc[]>;
    findOneById(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<PasswordHistoryDoc>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<PasswordHistoryDoc>;
    findOneByUser(
        user: string,
        password: string,
        options?: IDatabaseOptions
    ): Promise<PasswordHistoryDoc>;
    findOneUsedByUser(
        user: string,
        password: string,
        options?: IDatabaseOptions
    ): Promise<PasswordHistoryDoc>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    getTotalByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    createByUser(
        user: UserDoc,
        { type }: PasswordHistoryCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<PasswordHistoryDoc>;
    createByAdmin(
        user: UserDoc,
        { by, type }: PasswordHistoryCreateByAdminRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<PasswordHistoryDoc>;
    deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean>;
    mapList(
        userHistories: IPasswordHistoryDoc[] | IPasswordHistoryEntity[]
    ): PasswordHistoryListResponseDto[];
}
