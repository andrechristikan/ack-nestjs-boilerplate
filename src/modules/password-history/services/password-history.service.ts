import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { Document } from 'mongoose';
import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { PasswordHistoryCreateByAdminRequestDto } from 'src/modules/password-history/dtos/request/password-history.create-by-admin.request.dto';
import { PasswordHistoryCreateRequestDto } from 'src/modules/password-history/dtos/request/password-history.create.request.dto';
import { PasswordHistoryListResponseDto } from 'src/modules/password-history/dtos/response/password-history.list.response.dto';
import {
    IPasswordHistoryDoc,
    IPasswordHistoryEntity,
} from 'src/modules/password-history/interfaces/password-history.interface';
import { IPasswordHistoryService } from 'src/modules/password-history/interfaces/password-history.service.interface';
import {
    PasswordHistoryDoc,
    PasswordHistoryEntity,
} from 'src/modules/password-history/repository/entities/password-history.entity';
import { PasswordHistoryRepository } from 'src/modules/password-history/repository/repositories/password-history.repository';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class PasswordHistoryService implements IPasswordHistoryService {
    private readonly passwordPeriod: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly passwordHistoryRepository: PasswordHistoryRepository
    ) {
        this.passwordPeriod = this.configService.get<number>(
            'auth.password.period'
        );
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IPasswordHistoryDoc[]> {
        return this.passwordHistoryRepository.findAll<IPasswordHistoryDoc>(
            find,
            { ...options, join: true }
        );
    }

    async findAllByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IPasswordHistoryDoc[]> {
        return this.passwordHistoryRepository.findAll<IPasswordHistoryDoc>(
            { ...find, user },
            { ...options, join: true }
        );
    }

    async findOneById(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<PasswordHistoryDoc> {
        return this.passwordHistoryRepository.findOneById<PasswordHistoryDoc>(
            _id,
            options
        );
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<PasswordHistoryDoc> {
        return this.passwordHistoryRepository.findOne<PasswordHistoryDoc>(
            find,
            options
        );
    }

    async findOneByUser(
        user: string,
        password: string,
        options?: IDatabaseOptions
    ): Promise<PasswordHistoryDoc> {
        return this.passwordHistoryRepository.findOne<PasswordHistoryDoc>(
            {
                user,
                password,
            },
            options
        );
    }

    async findOneActiveByUser(
        user: string,
        password: string,
        options?: IDatabaseOptions
    ): Promise<PasswordHistoryDoc> {
        const today = this.helperDateService.create();

        return this.passwordHistoryRepository.findOne<PasswordHistoryDoc>(
            {
                user,
                password,
                expiredAt: {
                    $lte: today,
                },
            },
            options
        );
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.passwordHistoryRepository.getTotal(find, options);
    }

    async getTotalByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.passwordHistoryRepository.getTotal(
            { ...find, user },
            options
        );
    }

    async createByUser(
        user: UserDoc,
        { type }: PasswordHistoryCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<PasswordHistoryDoc> {
        const expiredAt: Date = this.helperDateService.forwardInSeconds(
            this.passwordPeriod
        );

        const create: PasswordHistoryEntity = new PasswordHistoryEntity();
        create.user = user._id;
        create.by = user._id;
        create.type = type;
        create.password = user.password;
        create.expiredAt = expiredAt;

        return this.passwordHistoryRepository.create<PasswordHistoryEntity>(
            create,
            options
        );
    }

    async createByAdmin(
        user: UserDoc,
        { by, type }: PasswordHistoryCreateByAdminRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<PasswordHistoryDoc> {
        const expiredAt: Date = this.helperDateService.forwardInSeconds(
            this.passwordPeriod
        );

        const create: PasswordHistoryEntity = new PasswordHistoryEntity();
        create.user = user._id;
        create.by = by;
        create.type = type;
        create.password = user.password;
        create.expiredAt = expiredAt;

        return this.passwordHistoryRepository.create<PasswordHistoryEntity>(
            create,
            options
        );
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean> {
        await this.passwordHistoryRepository.deleteMany(find, options);

        return true;
    }

    async getPasswordPeriod(): Promise<number> {
        return this.passwordPeriod;
    }

    async mapList(
        userHistories: IPasswordHistoryDoc[] | IPasswordHistoryEntity[]
    ): Promise<PasswordHistoryListResponseDto[]> {
        return plainToInstance(
            PasswordHistoryListResponseDto,
            userHistories.map(
                (e: IPasswordHistoryDoc | IPasswordHistoryEntity) =>
                    e instanceof Document ? e.toObject() : e
            )
        );
    }
}
