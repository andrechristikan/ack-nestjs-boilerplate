import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { plainToInstance } from 'class-transformer';
import { IUserService } from 'src/modules/user/interfaces/user.service.interface';
import { UserRepository } from 'src/modules/user/repositories/user.repository';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import {
    IUser,
    IUserCheckExist,
    IUserCreate,
} from 'src/modules/user/interfaces/user.interface';
import { User, UserEntity } from 'src/modules/user/schemas/user.schema';
import { UserUpdateDto } from 'src/modules/user/dtos/user.update.dto';
import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { UserPhotoDto } from 'src/modules/user/dtos/user.photo.dto';
import { UserPasswordDto } from 'src/modules/user/dtos/user.password.dto';
import { UserPasswordExpiredDto } from 'src/modules/user/dtos/user.password-expired.dto';
import { UserActiveDto } from 'src/modules/user/dtos/user.active.dto';
import { DatabasePrimaryKey } from 'src/common/database/decorators/database.decorator';

@Injectable()
export class UserService implements IUserService {
    private readonly uploadPath: string;

    constructor(
        private readonly userRepository: UserRepository,
        private readonly helperStringService: HelperStringService,
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

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number> {
        return this.userRepository.getTotal(find, options);
    }

    async create(
        {
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
    ): Promise<User> {
        const user: UserEntity = new UserEntity();
        user.firstName = firstName;
        user.email = email;
        user.mobileNumber = mobileNumber;
        user.password = password;
        user.role = DatabasePrimaryKey(role);
        user.isActive = true;
        user.lastName = lastName;
        user.salt = salt;
        user.passwordExpired = passwordExpired;

        return this.userRepository.create<UserEntity>(user, options);
    }

    async deleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<User> {
        return this.userRepository.deleteOneById(_id, options);
    }

    async deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<User> {
        return this.userRepository.deleteOne(find, options);
    }

    async updateOneById(
        _id: string,
        data: UserUpdateDto,
        options?: IDatabaseOptions
    ): Promise<User> {
        return this.userRepository.updateOneById<UserUpdateDto>(
            _id,
            data,
            options
        );
    }

    async checkExist(
        email: string,
        mobileNumber: string,
        options?: IDatabaseExistOptions
    ): Promise<IUserCheckExist> {
        const existEmail: boolean = await this.userRepository.exists(
            {
                email: {
                    $regex: new RegExp(email),
                    $options: 'i',
                },
            },
            options
        );

        const existMobileNumber: boolean = await this.userRepository.exists(
            {
                mobileNumber,
            },
            options
        );

        return {
            email: existEmail,
            mobileNumber: existMobileNumber,
        };
    }

    async updatePhoto(
        _id: string,
        aws: AwsS3Serialization,
        options?: IDatabaseOptions
    ): Promise<User> {
        const update: UserPhotoDto = {
            photo: aws,
        };

        return this.userRepository.updateOneById<{ photo: UserPhotoDto }>(
            _id,
            { photo: update },
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

    async updatePassword(
        _id: string,
        { salt, passwordHash, passwordExpired }: IAuthPassword,
        options?: IDatabaseOptions
    ): Promise<User> {
        const update: UserPasswordDto = {
            password: passwordHash,
            passwordExpired: passwordExpired,
            salt: salt,
        };

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
    ): Promise<User> {
        const update: UserPasswordExpiredDto = {
            passwordExpired: passwordExpired,
        };

        return this.userRepository.updateOneById(_id, update, options);
    }

    async inactive(_id: string, options?: IDatabaseOptions): Promise<User> {
        const update: UserActiveDto = {
            isActive: false,
        };

        return this.userRepository.updateOneById(_id, update, options);
    }

    async active(_id: string, options?: IDatabaseOptions): Promise<User> {
        const update: UserActiveDto = {
            isActive: true,
        };

        return this.userRepository.updateOneById(_id, update, options);
    }

    async payloadSerialization(data: IUser): Promise<UserPayloadSerialization> {
        return plainToInstance(UserPayloadSerialization, data);
    }
}
