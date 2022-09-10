import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { plainToInstance } from 'class-transformer';
import { IUserService } from 'src/modules/user/interfaces/user.service.interface';
import { UserRepository } from 'src/modules/user/repositories/user.repository';
import {
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import {
    IUserCheckExist,
    IUserCreate,
    IUserDocument,
} from 'src/modules/user/interfaces/user.interface';
import { UserDocument, UserEntity } from 'src/modules/user/schemas/user.schema';
import { UserUpdateDto } from 'src/modules/user/dtos/user.update.dto';
import { IAwsS3 } from 'src/common/aws/interfaces/aws.interface';
import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';

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
        find: Record<string, any>,
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

    async getTotal(find: Record<string, any>): Promise<number> {
        return this.userRepository.getTotal(find);
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
        options?: IDatabaseOptions
    ): Promise<UserDocument> {
        const user: UserEntity = {
            firstName,
            email,
            mobileNumber,
            password,
            role: new Types.ObjectId(role),
            isActive: true,
            lastName: lastName || undefined,
            salt,
            passwordExpired,
        };

        return this.userRepository.create<UserEntity>(user, options);
    }

    async deleteOneById(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<UserDocument> {
        return this.userRepository.deleteOneById(_id, options);
    }

    async deleteOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<UserDocument> {
        return this.userRepository.deleteOne(find, options);
    }

    async updateOneById(
        _id: string,
        { firstName, lastName }: UserUpdateDto,
        options?: IDatabaseOptions
    ): Promise<UserDocument> {
        const update = {
            firstName,
            lastName: lastName || undefined,
        };

        return this.userRepository.updateOneById(_id, update, options);
    }

    async checkExist(
        email: string,
        mobileNumber: string,
        excludeId?: string
    ): Promise<IUserCheckExist> {
        const existEmail: boolean = await this.userRepository.exists(
            {
                email: {
                    $regex: new RegExp(email),
                    $options: 'i',
                },
            },
            excludeId
        );

        const existMobileNumber: boolean = await this.userRepository.exists(
            {
                mobileNumber,
            },
            excludeId
        );

        return {
            email: existEmail,
            mobileNumber: existMobileNumber,
        };
    }

    async updatePhoto(
        _id: string,
        aws: IAwsS3,
        options?: IDatabaseOptions
    ): Promise<UserDocument> {
        const update = {
            photo: aws,
        };

        return this.userRepository.updateOneById(_id, update, options);
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
    ): Promise<UserDocument> {
        const update = {
            password: passwordHash,
            passwordExpired: passwordExpired,
            salt: salt,
        };

        return this.userRepository.updateOneById(_id, update, options);
    }

    async updatePasswordExpired(
        _id: string,
        passwordExpired: Date,
        options?: IDatabaseOptions
    ): Promise<UserDocument> {
        const update = {
            passwordExpired: passwordExpired,
        };

        return this.userRepository.updateOneById(_id, update, options);
    }

    async inactive(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<UserDocument> {
        const update = {
            isActive: false,
        };

        return this.userRepository.updateOneById(_id, update, options);
    }

    async active(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<UserDocument> {
        const update = {
            isActive: true,
        };

        return this.userRepository.updateOneById(_id, update, options);
    }

    async payloadSerialization(
        data: IUserDocument
    ): Promise<UserPayloadSerialization> {
        return plainToInstance(UserPayloadSerialization, data);
    }
}
