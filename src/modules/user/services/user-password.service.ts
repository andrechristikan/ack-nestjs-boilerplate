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
import { UserPasswordListResponseDto } from 'src/modules/user/dtos/response/user-password.list.response.dto';
import { IUserPasswordService } from 'src/modules/user/interfaces/user-password.service.interface';
import {
    UserPasswordDoc,
    UserPasswordEntity,
} from 'src/modules/user/repository/entities/user-password.entity';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { UserPasswordRepository } from 'src/modules/user/repository/repositories/user-password.repository';

@Injectable()
export class UserPasswordService implements IUserPasswordService {
    private readonly passwordPeriod: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly userPasswordRepository: UserPasswordRepository
    ) {
        this.passwordPeriod = this.configService.get<number>(
            'auth.password.period'
        );
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserPasswordDoc[]> {
        return this.userPasswordRepository.findAll<UserPasswordDoc>(
            find,
            options
        );
    }

    async findAllByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserPasswordDoc[]> {
        return this.userPasswordRepository.findAll<UserPasswordDoc>(
            { ...find, user },
            options
        );
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserPasswordDoc> {
        return this.userPasswordRepository.findOneById<UserPasswordDoc>(
            _id,
            options
        );
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<UserPasswordDoc> {
        return this.userPasswordRepository.findOne<UserPasswordDoc>(
            find,
            options
        );
    }

    async findOneByUser(
        user: UserDoc,
        password: IAuthPassword,
        options?: IDatabaseFindOneOptions
    ): Promise<UserPasswordDoc> {
        return this.userPasswordRepository.findOne<UserPasswordDoc>(
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
        return this.userPasswordRepository.getTotal(find, options);
    }

    async getTotalByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.userPasswordRepository.getTotal({ ...find, user }, options);
    }

    async createByUser(
        user: UserDoc,
        options?: IDatabaseCreateOptions
    ): Promise<UserPasswordDoc> {
        const create: UserPasswordEntity = new UserPasswordEntity();
        create.user = user._id;
        create.by = user._id;
        create.password = user.password;

        return this.userPasswordRepository.create<UserPasswordEntity>(
            create,
            options
        );
    }

    async createByAdmin(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserPasswordDoc> {
        const create: UserPasswordEntity = new UserPasswordEntity();
        create.user = user._id;
        create.by = by;
        create.password = user.password;

        return this.userPasswordRepository.create<UserPasswordEntity>(
            create,
            options
        );
    }

    async mapList(
        userHistories: UserPasswordDoc[]
    ): Promise<UserPasswordListResponseDto[]> {
        return plainToInstance(UserPasswordListResponseDto, userHistories);
    }
    async checkPasswordPeriodByUser(
        user: UserDoc,
        password: IAuthPassword,
        options?: IDatabaseFindOneOptions
    ): Promise<boolean> {
        const pass = await this.userPasswordRepository.findOne<UserPasswordDoc>(
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
