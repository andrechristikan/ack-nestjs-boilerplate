import { Injectable } from '@nestjs/common';
import { IUserService } from 'src/modules/user/interfaces/user.service.interface';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { UserUpdateDto } from 'src/modules/user/dtos/user.update.dto';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { UserPhotoDto } from 'src/modules/user/dtos/user.photo.dto';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserRepository } from 'src/modules/user/repository/repositories/user.repository';
import { UserPasswordDto } from 'src/modules/user/dtos/user.password.dto';
import { UserPasswordExpiredDto } from 'src/modules/user/dtos/user.password-expired.dto';
import { UserActiveDto } from 'src/modules/user/dtos/user.active.dto';
import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import { UserUseCase } from 'src/modules/user/use-cases/user.use-case';
import { UserPasswordAttemptDto } from 'src/modules/user/dtos/user.password-attempt.dto';
import { UserCreateDto } from 'src/modules/user/dtos/user.create.dto';

@Injectable()
export class UserService implements IUserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly userUseCase: UserUseCase
    ) {}

    async findAll<T>(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<T[]> {
        return this.userRepository.findAll<T>(find, options);
    }

    async findOneById<T>(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        return this.userRepository.findOneById<T>(_id, options);
    }

    async findOne<T>(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        return this.userRepository.findOne<T>(find, options);
    }

    async findOneByUsername<T>(
        username: string,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        return this.userRepository.findOne<T>({ username }, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number> {
        return this.userRepository.getTotal(find, options);
    }

    async create(
        data: UserCreateDto,
        password: IAuthPassword,
        options?: IDatabaseCreateOptions
    ): Promise<UserEntity> {
        const create: UserEntity = await this.userUseCase.create(
            data,
            password
        );

        return this.userRepository.create<UserEntity>(create, options);
    }

    async deleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<UserEntity> {
        return this.userRepository.deleteOneById(_id, options);
    }

    async deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<UserEntity> {
        return this.userRepository.deleteOne(find, options);
    }

    async updateOneById(
        _id: string,
        data: UserUpdateDto,
        options?: IDatabaseOptions
    ): Promise<UserEntity> {
        const update: UserUpdateDto = await this.userUseCase.update(data);

        return this.userRepository.updateOneById<UserUpdateDto>(
            _id,
            update,
            options
        );
    }

    async existEmail(
        email: string,
        options?: IDatabaseExistOptions
    ): Promise<boolean> {
        return this.userRepository.exists(
            {
                email: {
                    $regex: new RegExp(email),
                    $options: 'i',
                },
            },
            options
        );
    }

    async existMobileNumber(
        mobileNumber: string,
        options?: IDatabaseExistOptions
    ): Promise<boolean> {
        return this.userRepository.exists(
            {
                mobileNumber,
            },
            options
        );
    }

    async existUsername(
        username: string,
        options?: IDatabaseExistOptions
    ): Promise<boolean> {
        return this.userRepository.exists({ username }, options);
    }

    async updatePhoto(
        _id: string,
        photo: AwsS3Serialization,
        options?: IDatabaseOptions
    ): Promise<UserEntity> {
        const update: UserPhotoDto = await this.userUseCase.updatePhoto(photo);

        return this.userRepository.updateOneById<UserPhotoDto>(
            _id,
            update,
            options
        );
    }

    async updatePassword(
        _id: string,
        data: IAuthPassword,
        options?: IDatabaseOptions
    ): Promise<UserEntity> {
        const update: UserPasswordDto = await this.userUseCase.updatePassword(
            data
        );

        return this.userRepository.updateOneById<UserPasswordDto>(
            _id,
            update,
            options
        );
    }

    async updatePasswordExpired(
        _id: string,
        passwordExpired: Date,
        options?: IDatabaseOptions
    ): Promise<UserEntity> {
        const update: UserPasswordExpiredDto =
            await this.userUseCase.updatePasswordExpired(passwordExpired);

        return this.userRepository.updateOneById<UserPasswordExpiredDto>(
            _id,
            update,
            options
        );
    }

    async inactive(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<UserEntity> {
        const update: UserActiveDto = await this.userUseCase.inactive();

        return this.userRepository.updateOneById<UserActiveDto>(
            _id,
            update,
            options
        );
    }

    async active(_id: string, options?: IDatabaseOptions): Promise<UserEntity> {
        const update: UserActiveDto = await this.userUseCase.active();

        return this.userRepository.updateOneById<UserActiveDto>(
            _id,
            update,
            options
        );
    }

    async increasePasswordAttempt(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<UserEntity> {
        const user: UserEntity = await this.userRepository.findOneById(
            _id,
            options
        );

        const update: UserPasswordAttemptDto =
            await this.userUseCase.increasePasswordAttempt(user);

        return this.userRepository.updateOneById<UserPasswordAttemptDto>(
            _id,
            update,
            options
        );
    }

    async resetPasswordAttempt(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<UserEntity> {
        const update: UserPasswordAttemptDto =
            await this.userUseCase.resetPasswordAttempt();

        return this.userRepository.updateOneById(_id, update, options);
    }
}
