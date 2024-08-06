import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Document } from 'mongoose';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
} from 'src/common/database/interfaces/database.interface';
import { ENUM_USER_STATUS } from 'src/modules/user/enums/user.enum';
import { UserStateHistoryListResponseDto } from 'src/modules/user/dtos/response/user-state-history.list.response.dto';
import { IUserStateHistoryService } from 'src/modules/user/interfaces/user-state-history.service.interface';
import {
    IUserStateHistoryDoc,
    IUserStateHistoryEntity,
} from 'src/modules/user/interfaces/user.interface';
import {
    UserStateHistoryDoc,
    UserStateHistoryEntity,
} from 'src/modules/user/repository/entities/user-state-history.entity';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { UserStateHistoryRepository } from 'src/modules/user/repository/repositories/user-state-history.repository';

@Injectable()
export class UserStateHistoryService implements IUserStateHistoryService {
    constructor(
        private readonly userStateHistoryRepository: UserStateHistoryRepository
    ) {}

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserStateHistoryDoc[]> {
        return this.userStateHistoryRepository.findAll<IUserStateHistoryDoc>(
            find,
            {
                ...options,
                join: true,
            }
        );
    }

    async findAllByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserStateHistoryDoc[]> {
        return this.userStateHistoryRepository.findAll<IUserStateHistoryDoc>(
            { ...find, user },
            { ...options, join: true }
        );
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserStateHistoryDoc> {
        return this.userStateHistoryRepository.findOneById<UserStateHistoryDoc>(
            _id,
            options
        );
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<UserStateHistoryDoc> {
        return this.userStateHistoryRepository.findOne<UserStateHistoryDoc>(
            find,
            options
        );
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.userStateHistoryRepository.getTotal(find, options);
    }

    async getTotalByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.userStateHistoryRepository.getTotal(
            { ...find, user },
            options
        );
    }

    async createCreated(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserStateHistoryDoc> {
        const create: UserStateHistoryEntity = new UserStateHistoryEntity();
        create.afterState = ENUM_USER_STATUS.ACTIVE;
        create.beforeState = ENUM_USER_STATUS.CREATED;
        create.user = user._id;
        create.by = by;

        return this.userStateHistoryRepository.create<UserStateHistoryEntity>(
            create,
            options
        );
    }

    async createActive(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserStateHistoryDoc> {
        const create: UserStateHistoryEntity = new UserStateHistoryEntity();
        create.afterState = ENUM_USER_STATUS.ACTIVE;
        create.beforeState = user.status;
        create.user = user._id;
        create.by = by;

        return this.userStateHistoryRepository.create<UserStateHistoryEntity>(
            create,
            options
        );
    }

    async createInactive(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserStateHistoryDoc> {
        const create: UserStateHistoryEntity = new UserStateHistoryEntity();
        create.afterState = ENUM_USER_STATUS.INACTIVE;
        create.beforeState = user.status;
        create.user = user._id;
        create.by = by;

        return this.userStateHistoryRepository.create<UserStateHistoryEntity>(
            create,
            options
        );
    }

    async createBlocked(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserStateHistoryDoc> {
        const create: UserStateHistoryEntity = new UserStateHistoryEntity();
        create.afterState = ENUM_USER_STATUS.BLOCKED;
        create.beforeState = user.status;
        create.user = user._id;
        create.by = by;

        return this.userStateHistoryRepository.create<UserStateHistoryEntity>(
            create,
            options
        );
    }

    async createDeleted(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserStateHistoryDoc> {
        const create: UserStateHistoryEntity = new UserStateHistoryEntity();
        create.afterState = ENUM_USER_STATUS.DELETED;
        create.beforeState = user.status;
        create.user = user._id;
        create.by = by;

        return this.userStateHistoryRepository.create<UserStateHistoryEntity>(
            create,
            options
        );
    }

    async mapList(
        userHistories: IUserStateHistoryDoc[] | IUserStateHistoryEntity[]
    ): Promise<UserStateHistoryListResponseDto[]> {
        return plainToInstance(
            UserStateHistoryListResponseDto,
            userHistories.map(
                (e: IUserStateHistoryDoc | IUserStateHistoryEntity) =>
                    e instanceof Document ? e.toObject() : e
            )
        );
    }
}
