import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { ActivityCreateByAdminResponse } from 'src/modules/activity/dtos/request/activity.create-by-admin.response.dto';
import { ActivityCreateResponse } from 'src/modules/activity/dtos/request/activity.create.response.dto';
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
