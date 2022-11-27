import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { IUserService } from 'src/modules/user/interfaces/user.service.interface';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { IUserCreate } from 'src/modules/user/interfaces/user.interface';
import { UserUpdateDto } from 'src/modules/user/dtos/user.update.dto';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { UserPhotoDto } from 'src/modules/user/dtos/user.photo.dto';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserRepository } from 'src/modules/user/repository/repositories/user.repository';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';

@Injectable()
export class UserService implements IUserService {
    private readonly uploadPath: string;

    constructor(
        private readonly userRepository: UserRepository,
        private readonly helperStringService: HelperStringService,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.uploadPath = this.configService.get<string>('user.uploadPath');
    }

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
        {
            username,
            firstName,
            lastName,
            password,
            passwordExpired,
            salt,
            email,
            mobileNumber,
            role,
        }: IUserCreate,
        options?: IDatabaseCreateOptions
    ): Promise<UserEntity> {
        const user: UserEntity = new UserEntity();
        user.username = username;
        user.firstName = firstName;
        user.email = email;
        user.password = password;
        user.role = role;
        user.isActive = true;
        user.lastName = lastName;
        user.salt = salt;
        user.passwordExpired = passwordExpired;
        user.signUpDate = this.helperDateService.create();
        user.passwordAttempt = 0;

        if (mobileNumber) {
            user.mobileNumber = mobileNumber;
        }

        return this.userRepository.create<UserEntity>(user, options);
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
        aws: AwsS3Serialization,
        options?: IDatabaseOptions
    ): Promise<UserEntity> {
        const update: UserPhotoDto = {
            photo: aws,
        };

        return this.userRepository.updateOneById<UserPhotoDto>(
            _id,
            update,
            options
        );
    }

    async createRandomFilename(): Promise<Record<string, any>> {
        const filename: string = this.helperStringService.random(20);

        return {
            path: this.uploadPath,
            filename: filename,
        };
    }
}
