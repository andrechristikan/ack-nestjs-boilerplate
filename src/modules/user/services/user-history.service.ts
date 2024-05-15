import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
} from 'src/common/database/interfaces/database.interface';
import { ENUM_USER_HISTORY_STATE } from 'src/modules/user/constants/user-history.enum.constant';
import { ENUM_USER_STATUS } from 'src/modules/user/constants/user.enum.constant';
import { UserHistoryListResponseDto } from 'src/modules/user/dtos/response/user-history.list.response.dto';
import { IUserHistoryService } from 'src/modules/user/interfaces/user-history.service.interface';
import {
    UserHistoryDoc,
    UserHistoryEntity,
} from 'src/modules/user/repository/entities/user-history.entity';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { UserHistoryRepository } from 'src/modules/user/repository/repositories/user-history.repository';

@Injectable()
export class UserHistoryService implements IUserHistoryService {
    constructor(
        private readonly userHistoryRepository: UserHistoryRepository
    ) {}

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserHistoryDoc[]> {
        return this.userHistoryRepository.findAll<UserHistoryDoc>(
            find,
            options
        );
    }

    async findAllByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserHistoryDoc[]> {
        return this.userHistoryRepository.findAll<UserHistoryDoc>(
            { ...find, user },
            options
        );
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserHistoryDoc> {
        return this.userHistoryRepository.findOneById<UserHistoryDoc>(
            _id,
            options
        );
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<UserHistoryDoc> {
        return this.userHistoryRepository.findOne<UserHistoryDoc>(
            find,
            options
        );
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.userHistoryRepository.getTotal(find, options);
    }

    async getTotalByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.userHistoryRepository.getTotal({ ...find, user }, options);
    }

    async setStateByUser(user: UserDoc): Promise<ENUM_USER_HISTORY_STATE> {
        if (user.blocked) {
            return ENUM_USER_HISTORY_STATE.BLOCKED;
        }

        switch (user.status) {
            case ENUM_USER_STATUS.DELETED:
                return ENUM_USER_HISTORY_STATE.DELETED;
            case ENUM_USER_STATUS.ACTIVE:
                return ENUM_USER_HISTORY_STATE.ACTIVE;
            case ENUM_USER_STATUS.INACTIVE:
            default:
                return ENUM_USER_HISTORY_STATE.INACTIVE;
        }
    }

    async createActiveByUser(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserHistoryDoc> {
        const beforeState = await this.setStateByUser(user);
        const create: UserHistoryEntity = new UserHistoryEntity();
        create.afterState = ENUM_USER_HISTORY_STATE.ACTIVE;
        create.beforeState = beforeState;
        create.user = user._id;
        create.by = by;

        return this.userHistoryRepository.create<UserHistoryEntity>(
            create,
            options
        );
    }

    async createInactiveByUser(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserHistoryDoc> {
        const beforeState = await this.setStateByUser(user);
        const create: UserHistoryEntity = new UserHistoryEntity();
        create.afterState = ENUM_USER_HISTORY_STATE.INACTIVE;
        create.beforeState = beforeState;
        create.user = user._id;
        create.by = by;

        return this.userHistoryRepository.create<UserHistoryEntity>(
            create,
            options
        );
    }

    async createBlockedByUser(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserHistoryDoc> {
        const beforeState = await this.setStateByUser(user);
        const create: UserHistoryEntity = new UserHistoryEntity();
        create.afterState = ENUM_USER_HISTORY_STATE.BLOCKED;
        create.beforeState = beforeState;
        create.user = user._id;
        create.by = by;

        return this.userHistoryRepository.create<UserHistoryEntity>(
            create,
            options
        );
    }

    async createDeletedByUser(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserHistoryDoc> {
        const beforeState = await this.setStateByUser(user);
        const create: UserHistoryEntity = new UserHistoryEntity();
        create.afterState = ENUM_USER_HISTORY_STATE.DELETED;
        create.beforeState = beforeState;
        create.user = user._id;
        create.by = by;

        return this.userHistoryRepository.create<UserHistoryEntity>(
            create,
            options
        );
    }

    async mapList(
        userHistories: UserHistoryDoc[]
    ): Promise<UserHistoryListResponseDto[]> {
        return plainToInstance(UserHistoryListResponseDto, userHistories);
    }
}
