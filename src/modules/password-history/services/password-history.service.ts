import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { Duration } from 'luxon';
import { Document } from 'mongoose';
import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
} from 'src/common/database/interfaces/database.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';
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
        private readonly helperHashService: HelperHashService,
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
        options?: IDatabaseFindOneOptions
    ): Promise<PasswordHistoryDoc> {
        return this.passwordHistoryRepository.findOneById<PasswordHistoryDoc>(
            _id,
            options
        );
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<PasswordHistoryDoc> {
        return this.passwordHistoryRepository.findOne<PasswordHistoryDoc>(
            find,
            options
        );
    }

    async findOneByUser(
        user: string,
        password: string,
        options?: IDatabaseFindOneOptions
    ): Promise<PasswordHistoryDoc> {
        return this.passwordHistoryRepository.findOne<PasswordHistoryDoc>(
            {
                user,
                password,
            },
            options
        );
    }

    async findOneUsedByUser(
        user: string,
        password: string,
        options?: IDatabaseFindOneOptions
    ): Promise<PasswordHistoryDoc> {
        const today = this.helperDateService.create();
        const allHistoryPasswords =
            await this.passwordHistoryRepository.findAll<PasswordHistoryDoc>(
                {
                    user,
                    expiredAt: { $gte: today },
                },
                options
            );

        for (const historyPassword of allHistoryPasswords) {
            const isMatch = this.helperHashService.bcryptCompare(
                password,
                historyPassword.password
            );
            if (isMatch) {
                return historyPassword;
            }
        }

        return null;
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
        const today = this.helperDateService.create();
        const expiredAt: Date = this.helperDateService.forward(
            today,
            Duration.fromObject({
                seconds: this.passwordPeriod,
            })
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
        const today = this.helperDateService.create();
        const expiredAt: Date = this.helperDateService.forward(
            today,
            Duration.fromObject({
                seconds: this.passwordPeriod,
            })
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
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean> {
        await this.passwordHistoryRepository.deleteMany(find, options);

        return true;
    }

    async getPasswordPeriod(): Promise<number> {
        return this.passwordPeriod;
    }

    mapList(
        userHistories: IPasswordHistoryDoc[] | IPasswordHistoryEntity[]
    ): PasswordHistoryListResponseDto[] {
        return plainToInstance(
            PasswordHistoryListResponseDto,
            userHistories.map(
                (e: IPasswordHistoryDoc | IPasswordHistoryEntity) =>
                    e instanceof Document ? e.toObject() : e
            )
        );
    }
}
