import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
} from 'src/common/database/interfaces/database.interface';
import { UserStateHistoryListResponseDto } from 'src/modules/user/dtos/response/user-state-history.list.response.dto';
import {
    IUserStateHistoryDoc,
    IUserStateHistoryEntity,
} from 'src/modules/user/interfaces/user.interface';
import { UserStateHistoryDoc } from 'src/modules/user/repository/entities/user-state-history.entity';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';

export interface IUserStateHistoryService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserStateHistoryDoc[]>;
    findAllByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserStateHistoryDoc[]>;
    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserStateHistoryDoc>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<UserStateHistoryDoc>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    getTotalByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    createCreated(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserStateHistoryDoc>;
    createActive(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserStateHistoryDoc>;
    createInactive(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserStateHistoryDoc>;
    createBlocked(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserStateHistoryDoc>;
    createDeleted(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserStateHistoryDoc>;
    mapList(
        userHistories: IUserStateHistoryDoc[] | IUserStateHistoryEntity[]
    ): Promise<UserStateHistoryListResponseDto[]>;
}
