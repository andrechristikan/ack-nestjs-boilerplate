import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Document } from 'mongoose';
import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
} from 'src/common/database/interfaces/database.interface';
import { ActivityCreateByAdminResponse } from 'src/modules/activity/dtos/request/activity.create-by-admin.response.dto';
import { ActivityCreateResponse } from 'src/modules/activity/dtos/request/activity.create.response.dto';
import { ActivityListResponseDto } from 'src/modules/activity/dtos/response/activity.list.response.dto';
import {
    IActivityDoc,
    IActivityEntity,
} from 'src/modules/activity/interfaces/activity.interface';
import { IActivityService } from 'src/modules/activity/interfaces/activity.service.interface';
import {
    ActivityDoc,
    ActivityEntity,
} from 'src/modules/activity/repository/entities/activity.entity';
import { ActivityRepository } from 'src/modules/activity/repository/repositories/activity.repository';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class ActivityService implements IActivityService {
    constructor(private readonly activityRepository: ActivityRepository) {}

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IActivityDoc[]> {
        return this.activityRepository.findAll<IActivityDoc>(find, {
            ...options,
            join: true,
        });
    }

    async findAllByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IActivityDoc[]> {
        return this.activityRepository.findAll<IActivityDoc>(
            { ...find, user },
            { ...options, join: true }
        );
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ActivityDoc> {
        return this.activityRepository.findOneById<ActivityDoc>(_id, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<ActivityDoc> {
        return this.activityRepository.findOne<ActivityDoc>(find, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.activityRepository.getTotal(find, options);
    }

    async getTotalByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.activityRepository.getTotal({ ...find, user }, options);
    }

    async createByUser(
        user: UserDoc,
        { description }: ActivityCreateResponse,
        options?: IDatabaseCreateOptions
    ): Promise<ActivityDoc> {
        const create: ActivityEntity = new ActivityEntity();
        create.description = description;
        create.user = user._id;
        create.by = user._id;

        return this.activityRepository.create<ActivityEntity>(create, options);
    }

    async createByAdmin(
        user: UserDoc,
        { by, description }: ActivityCreateByAdminResponse,
        options?: IDatabaseCreateOptions
    ): Promise<ActivityDoc> {
        const create: ActivityEntity = new ActivityEntity();
        create.description = description;
        create.user = user._id;
        create.by = by;

        return this.activityRepository.create<ActivityEntity>(create, options);
    }

    async deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean> {
        await this.activityRepository.deleteMany(find, options);

        return true;
    }

    mapList(
        userHistories: IActivityDoc[] | IActivityEntity[]
    ): ActivityListResponseDto[] {
        return plainToInstance(
            ActivityListResponseDto,
            userHistories.map((e: IActivityDoc | IActivityEntity) =>
                e instanceof Document ? e.toObject() : e
            )
        );
    }
}
