import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Request } from 'express';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
} from 'src/common/database/interfaces/database.interface';
import { UserLoginHistoryCreateRequest } from 'src/modules/user/dtos/request/user-login-history.create.request.dto';
import { UserLoginHistoryListResponseDto } from 'src/modules/user/dtos/response/user-login-history.list.response.dto';
import { IUserLoginHistoryService } from 'src/modules/user/interfaces/user-login-history.service.interface';
import {
    UserLoginHistoryDoc,
    UserLoginHistoryEntity,
} from 'src/modules/user/repository/entities/user-login-history.entity';
import { UserLoginHistoryRepository } from 'src/modules/user/repository/repositories/user-login-history.repository';

@Injectable()
export class UserLoginHistoryService implements IUserLoginHistoryService {
    constructor(
        private readonly userLoginHistoryRepository: UserLoginHistoryRepository
    ) {}

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserLoginHistoryDoc[]> {
        return this.userLoginHistoryRepository.findAll<UserLoginHistoryDoc>(
            find,
            options
        );
    }

    async findAllByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserLoginHistoryDoc[]> {
        return this.userLoginHistoryRepository.findAll<UserLoginHistoryDoc>(
            { user, ...find },
            options
        );
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserLoginHistoryDoc> {
        return this.userLoginHistoryRepository.findOneById<UserLoginHistoryDoc>(
            _id,
            options
        );
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<UserLoginHistoryDoc> {
        return this.userLoginHistoryRepository.findOne<UserLoginHistoryDoc>(
            find,
            options
        );
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.userLoginHistoryRepository.getTotal(find, options);
    }

    async getTotalByUser(
        user: string,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.userLoginHistoryRepository.getTotal({ user }, options);
    }

    async create(
        request: Request,
        { user }: UserLoginHistoryCreateRequest,
        options?: IDatabaseCreateOptions
    ): Promise<UserLoginHistoryDoc> {
        const create = new UserLoginHistoryEntity();
        create.user = user;
        create.hostname = request.hostname;
        create.ip = request.ip;
        create.protocol = request.protocol;
        create.originalUrl = request.originalUrl;
        create.method = request.method;

        create.userAgent = request.headers['user-agent'] as string;
        create.xForwardedFor = request.headers['x-forwarded-for'] as string;
        create.xForwardedHost = request.headers['x-forwarded-host'] as string;
        create.xForwardedPorto = request.headers['x-forwarded-porto'] as string;

        return this.userLoginHistoryRepository.create<UserLoginHistoryEntity>(
            create,
            options
        );
    }

    async mapList(
        userHistories: UserLoginHistoryDoc[]
    ): Promise<UserLoginHistoryListResponseDto[]> {
        return plainToInstance(UserLoginHistoryListResponseDto, userHistories);
    }
}
