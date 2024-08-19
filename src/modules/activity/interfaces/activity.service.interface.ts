import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { ActivityListResponseDto } from 'src/modules/activity/dtos/response/activity.list.response.dto';
import {
    IActivityDoc,
    IActivityEntity,
} from 'src/modules/activity/interfaces/activity.interface';
import { ActivityDoc } from 'src/modules/activity/repository/entities/activity.entity';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';

export interface IActivityService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IActivityDoc[]>;
    findAllByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IActivityDoc[]>;
    findOneById(_id: string, options?: IDatabaseOptions): Promise<ActivityDoc>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<ActivityDoc>;
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
    ): Promise<ActivityDoc>;
    createActive(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<ActivityDoc>;
    createInactive(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<ActivityDoc>;
    createBlocked(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<ActivityDoc>;
    createDeleted(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<ActivityDoc>;
    mapList(
        userHistories: IActivityDoc[] | IActivityEntity[]
    ): Promise<ActivityListResponseDto[]>;
}
