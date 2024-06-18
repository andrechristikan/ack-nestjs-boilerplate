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
import { UserStateHistoryListResponseDto } from 'src/modules/user/dtos/response/user-state-history.list.response.dto';
import { IUserStateHistoryService } from 'src/modules/user/interfaces/user-state-history.service.interface';
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
    ): Promise<UserStateHistoryDoc[]> {
        return this.userStateHistoryRepository.findAll<UserStateHistoryDoc>(
            find,
            options
        );
    }

    async findAllByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserStateHistoryDoc[]> {
        return this.userStateHistoryRepository.findAll<UserStateHistoryDoc>(
            { ...find, user },
            options
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

    async setState(user: UserDoc): Promise<ENUM_USER_HISTORY_STATE> {
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

    async createCreated(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserStateHistoryDoc> {
        const create: UserStateHistoryEntity = new UserStateHistoryEntity();
        create.afterState = ENUM_USER_HISTORY_STATE.ACTIVE;
        create.beforeState = ENUM_USER_HISTORY_STATE.CREATED;
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
        const beforeState = await this.setState(user);
        const create: UserStateHistoryEntity = new UserStateHistoryEntity();
        create.afterState = ENUM_USER_HISTORY_STATE.ACTIVE;
        create.beforeState = beforeState;
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
        const beforeState = await this.setState(user);
        const create: UserStateHistoryEntity = new UserStateHistoryEntity();
        create.afterState = ENUM_USER_HISTORY_STATE.INACTIVE;
        create.beforeState = beforeState;
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
        const beforeState = await this.setState(user);
        const create: UserStateHistoryEntity = new UserStateHistoryEntity();
        create.afterState = ENUM_USER_HISTORY_STATE.BLOCKED;
        create.beforeState = beforeState;
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
        const beforeState = await this.setState(user);
        const create: UserStateHistoryEntity = new UserStateHistoryEntity();
        create.afterState = ENUM_USER_HISTORY_STATE.DELETED;
        create.beforeState = beforeState;
        create.user = user._id;
        create.by = by;

        return this.userStateHistoryRepository.create<UserStateHistoryEntity>(
            create,
            options
        );
    }

    async mapList(
        userHistories: UserStateHistoryDoc[]
    ): Promise<UserStateHistoryListResponseDto[]> {
        return plainToInstance(UserStateHistoryListResponseDto, userHistories);
    }
}
