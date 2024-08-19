import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Document } from 'mongoose';
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
import { IActivityService } from 'src/modules/activity/interfaces/activity.service.interface';
import {
    ActivityDoc,
    ActivityEntity,
} from 'src/modules/activity/repository/entities/activity.entity';
import { ActivityRepository } from 'src/modules/activity/repository/repositories/activity.repository';
import { ENUM_USER_STATUS } from 'src/modules/user/enums/user.enum';
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
        options?: IDatabaseOptions
    ): Promise<ActivityDoc> {
        return this.activityRepository.findOneById<ActivityDoc>(_id, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
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

    async createCreated(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<ActivityDoc> {
        const create: ActivityEntity = new ActivityEntity();
        create.after = ENUM_USER_STATUS.ACTIVE;
        create.before = ENUM_USER_STATUS.CREATED;
        create.user = user._id;
        create.by = by;

        return this.activityRepository.create<ActivityEntity>(create, options);
    }

    async createActive(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<ActivityDoc> {
        const create: ActivityEntity = new ActivityEntity();
        create.after = ENUM_USER_STATUS.ACTIVE;
        create.before = user.status;
        create.user = user._id;
        create.by = by;

        return this.activityRepository.create<ActivityEntity>(create, options);
    }

    async createInactive(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<ActivityDoc> {
        const create: ActivityEntity = new ActivityEntity();
        create.after = ENUM_USER_STATUS.INACTIVE;
        create.before = user.status;
        create.user = user._id;
        create.by = by;

        return this.activityRepository.create<ActivityEntity>(create, options);
    }

    async createBlocked(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<ActivityDoc> {
        const create: ActivityEntity = new ActivityEntity();
        create.after = ENUM_USER_STATUS.BLOCKED;
        create.before = user.status;
        create.user = user._id;
        create.by = by;

        return this.activityRepository.create<ActivityEntity>(create, options);
    }

    async createDeleted(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<ActivityDoc> {
        const create: ActivityEntity = new ActivityEntity();
        create.after = ENUM_USER_STATUS.DELETED;
        create.before = user.status;
        create.user = user._id;
        create.by = by;

        return this.activityRepository.create<ActivityEntity>(create, options);
    }

    async mapList(
        userHistories: IActivityDoc[] | IActivityEntity[]
    ): Promise<ActivityListResponseDto[]> {
        return plainToInstance(
            ActivityListResponseDto,
            userHistories.map((e: IActivityDoc | IActivityEntity) =>
                e instanceof Document ? e.toObject() : e
            )
        );
    }
}
