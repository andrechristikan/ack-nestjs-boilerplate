import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
} from 'src/common/database/interfaces/database.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { UserPasswordHistoryListResponseDto } from 'src/modules/user/dtos/response/user-password-history.list.response.dto';
import { IUserPasswordHistoryService } from 'src/modules/user/interfaces/user-password-history.service.interface';
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
    ): Promise<UserPasswordHistoryDoc[]> {
        return this.userPasswordHistoryRepository.findAll<UserPasswordHistoryDoc>(
            find,
            options
        );
    }

    async findAllByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserPasswordHistoryDoc[]> {
        return this.userPasswordHistoryRepository.findAll<UserPasswordHistoryDoc>(
            { ...find, user },
            options
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
        options?: IDatabaseCreateOptions
    ): Promise<UserPasswordHistoryDoc> {
        const create: UserPasswordHistoryEntity =
            new UserPasswordHistoryEntity();
        create.user = user._id;
        create.by = user._id;
        create.password = user.password;

        return this.userPasswordHistoryRepository.create<UserPasswordHistoryEntity>(
            create,
            options
        );
    }

    async createByAdmin(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserPasswordHistoryDoc> {
        const create: UserPasswordHistoryEntity =
            new UserPasswordHistoryEntity();
        create.user = user._id;
        create.by = by;
        create.password = user.password;

        return this.userPasswordHistoryRepository.create<UserPasswordHistoryEntity>(
            create,
            options
        );
    }

    async mapList(
        userHistories: UserPasswordHistoryDoc[]
    ): Promise<UserPasswordHistoryListResponseDto[]> {
        return plainToInstance(
            UserPasswordHistoryListResponseDto,
            userHistories
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
}
