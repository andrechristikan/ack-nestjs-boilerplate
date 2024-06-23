import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { Document } from 'mongoose';
import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
} from 'src/common/database/interfaces/database.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import {
    UserCreatePasswordByAdminRequestDto,
    UserCreatePasswordRequestDto,
} from 'src/modules/user/dtos/request/user.create-password.request.dto';
import { UserPasswordHistoryListResponseDto } from 'src/modules/user/dtos/response/user-password-history.list.response.dto';
import { IUserPasswordHistoryService } from 'src/modules/user/interfaces/user-password-history.service.interface';
import {
    IUserPasswordHistoryDoc,
    IUserPasswordHistoryEntity,
} from 'src/modules/user/interfaces/user.interface';
import {
    UserPasswordHistoryDoc,
    UserPasswordHistoryEntity,
} from 'src/modules/user/repository/entities/user-password-history.entity';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { UserPasswordHistoryRepository } from 'src/modules/user/repository/repositories/user-password-history.repository';

@Injectable()
export class UserPasswordHistoryService implements IUserPasswordHistoryService {
    private readonly passwordPeriod: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly userPasswordHistoryRepository: UserPasswordHistoryRepository
    ) {
        this.passwordPeriod = this.configService.get<number>(
            'auth.password.period'
        );
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserPasswordHistoryDoc[]> {
        return this.userPasswordHistoryRepository.findAll<IUserPasswordHistoryDoc>(
            find,
            { ...options, join: true }
        );
    }

    async findAllByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserPasswordHistoryDoc[]> {
        return this.userPasswordHistoryRepository.findAll<IUserPasswordHistoryDoc>(
            { ...find, user },
            { ...options, join: true }
        );
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserPasswordHistoryDoc> {
        return this.userPasswordHistoryRepository.findOneById<UserPasswordHistoryDoc>(
            _id,
            options
        );
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<UserPasswordHistoryDoc> {
        return this.userPasswordHistoryRepository.findOne<UserPasswordHistoryDoc>(
            find,
            options
        );
    }

    async findOneByUser(
        user: UserDoc,
        password: IAuthPassword,
        options?: IDatabaseFindOneOptions
    ): Promise<UserPasswordHistoryDoc> {
        return this.userPasswordHistoryRepository.findOne<UserPasswordHistoryDoc>(
            {
                user: user._id,
                password: password.passwordHash,
            },
            options
        );
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.userPasswordHistoryRepository.getTotal(find, options);
    }

    async getTotalByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.userPasswordHistoryRepository.getTotal(
            { ...find, user },
            options
        );
    }

    async createByUser(
        user: UserDoc,
        { type }: UserCreatePasswordRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<UserPasswordHistoryDoc> {
        const create: UserPasswordHistoryEntity =
            new UserPasswordHistoryEntity();
        create.user = user._id;
        create.by = user._id;
        create.type = type;
        create.password = user.password;

        return this.userPasswordHistoryRepository.create<UserPasswordHistoryEntity>(
            create,
            options
        );
    }

    async createByAdmin(
        user: UserDoc,
        { by, type }: UserCreatePasswordByAdminRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<UserPasswordHistoryDoc> {
        const create: UserPasswordHistoryEntity =
            new UserPasswordHistoryEntity();
        create.user = user._id;
        create.by = by;
        create.type = type;
        create.password = user.password;

        return this.userPasswordHistoryRepository.create<UserPasswordHistoryEntity>(
            create,
            options
        );
    }

    async checkPasswordPeriodByUser(
        user: UserDoc,
        password: IAuthPassword,
        options?: IDatabaseFindOneOptions
    ): Promise<boolean> {
        const pass =
            await this.userPasswordHistoryRepository.findOne<UserPasswordHistoryDoc>(
                {
                    user: user._id,
                    password: password.passwordHash,
                },
                options
            );

        const today: Date = this.helperDateService.create();
        const passwordPeriod: Date = this.helperDateService.forwardInSeconds(
            this.passwordPeriod,
            { fromDate: pass.createdAt }
        );

        return today > passwordPeriod;
    }

    async getPasswordPeriod(): Promise<number> {
        return this.passwordPeriod;
    }

    async mapList(
        userHistories: IUserPasswordHistoryDoc[] | IUserPasswordHistoryEntity[]
    ): Promise<UserPasswordHistoryListResponseDto[]> {
        return plainToInstance(
            UserPasswordHistoryListResponseDto,
            userHistories.map(
                (e: IUserPasswordHistoryDoc | IUserPasswordHistoryEntity) =>
                    e instanceof Document ? e.toObject() : e
            )
        );
    }
}
