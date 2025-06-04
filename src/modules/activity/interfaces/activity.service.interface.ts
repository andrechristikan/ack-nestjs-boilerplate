import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
} from '@common/database/interfaces/database.interface';
import { ActivityCreateByAdminResponse } from '@module/activity/dtos/request/activity.create-by-admin.response.dto';
import { ActivityCreateResponse } from '@module/activity/dtos/request/activity.create.response.dto';
import { ActivityListResponseDto } from '@module/activity/dtos/response/activity.list.response.dto';
import {
    IActivityDoc,
    IActivityEntity,
} from '@module/activity/interfaces/activity.interface';
import { ActivityDoc } from '@module/activity/repository/entities/activity.entity';
import { UserDoc } from '@module/user/repository/entities/user.entity';

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
    createByUser(
        user: UserDoc,
        { description }: ActivityCreateResponse,
        options?: IDatabaseCreateOptions
    ): Promise<ActivityDoc>;
    createByAdmin(
        user: UserDoc,
        { by, description }: ActivityCreateByAdminResponse,
        options?: IDatabaseCreateOptions
    ): Promise<ActivityDoc>;
    deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean>;
    mapList(
        userHistories: IActivityDoc[] | IActivityEntity[]
    ): ActivityListResponseDto[];
}
