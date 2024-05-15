import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
} from 'src/common/database/interfaces/database.interface';
import { UserHistoryListResponseDto } from 'src/modules/user/dtos/response/user-history.list.response.dto';
import { UserHistoryDoc } from 'src/modules/user/repository/entities/user-history.entity';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';

export interface IUserHistoryService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserHistoryDoc[]>;
    findAllByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserHistoryDoc[]>;
    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserHistoryDoc>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<UserHistoryDoc>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    getTotalByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    createActiveByUser(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserHistoryDoc>;
    createInactiveByUser(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserHistoryDoc>;
    createBlockedByUser(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserHistoryDoc>;
    createDeletedByUser(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserHistoryDoc>;
    mapList(
        userHistories: UserHistoryDoc[]
    ): Promise<UserHistoryListResponseDto[]>;
}
