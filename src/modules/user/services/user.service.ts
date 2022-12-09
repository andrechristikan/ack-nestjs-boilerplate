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
import { UserPhotoDto } from 'src/modules/user/dtos/user.photo.dto';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserRepository } from 'src/modules/user/repository/repositories/user.repository';
import { UserPasswordDto } from 'src/modules/user/dtos/user.password.dto';
import { UserPasswordExpiredDto } from 'src/modules/user/dtos/user.password-expired.dto';
import { UserActiveDto } from 'src/modules/user/dtos/user.active.dto';
import { UserPasswordAttemptDto } from 'src/modules/user/dtos/user.password-attempt.dto';

@Injectable()
export class UserService implements IUserService {
    constructor(private readonly userRepository: UserRepository) {}

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
        data: UserEntity,
        options?: IDatabaseCreateOptions
    ): Promise<UserEntity> {
        return this.userRepository.create<UserEntity>(data, options);
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
        return this.userRepository.updateOneById<UserUpdateDto>(
            _id,
            data,
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
        data: UserPhotoDto,
        options?: IDatabaseOptions
    ): Promise<UserEntity> {
        return this.userRepository.updateOneById<UserPhotoDto>(
            _id,
            data,
            options
        );
    }

    async updatePassword(
        _id: string,
        data: UserPasswordDto,
        options?: IDatabaseOptions
    ): Promise<UserEntity> {
        return this.userRepository.updateOneById<UserPasswordDto>(
            _id,
            data,
            options
        );
    }

    async updatePasswordExpired(
        _id: string,
        data: UserPasswordExpiredDto,
        options?: IDatabaseOptions
    ): Promise<UserEntity> {
        return this.userRepository.updateOneById<UserPasswordExpiredDto>(
            _id,
            data,
            options
        );
    }

    async updateIsActive(
        _id: string,
        data: UserActiveDto,
        options?: IDatabaseOptions
    ): Promise<UserEntity> {
        return this.userRepository.updateOneById<UserActiveDto>(
            _id,
            data,
            options
        );
    }

    async updatePasswordAttempt(
        _id: string,
        data: UserPasswordAttemptDto,
        options?: IDatabaseOptions
    ): Promise<UserEntity> {
        return this.userRepository.updateOneById<UserPasswordAttemptDto>(
            _id,
            data,
            options
        );
    }
}
