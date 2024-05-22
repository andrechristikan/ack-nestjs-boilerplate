import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
} from 'src/common/database/interfaces/database.interface';
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
    constructor(
        private readonly userPasswordRepository: UserPasswordRepository
    ) {}

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
}
