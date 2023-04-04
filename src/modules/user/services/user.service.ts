import { Injectable } from '@nestjs/common';
import { IUserService } from 'src/modules/user/interfaces/user.service.interface';
import {
    IDatabaseCreateOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
    IDatabaseManyOptions,
} from 'src/common/database/interfaces/database.interface';
import {
    UserDoc,
    UserEntity,
} from 'src/modules/user/repository/entities/user.entity';
import { UserRepository } from 'src/modules/user/repository/repositories/user.repository';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { ConfigService } from '@nestjs/config';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { UserCreateDto } from 'src/modules/user/dtos/user.create.dto';
import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { UserUpdateNameDto } from 'src/modules/user/dtos/user.update-name.dto';
import {
    IUserDoc,
    IUserEntity,
} from 'src/modules/user/interfaces/user.interface';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';
import { plainToInstance } from 'class-transformer';
import { RoleEntity } from 'src/common/role/repository/entities/role.entity';

@Injectable()
export class UserService implements IUserService {
    private readonly uploadPath: string;
    private readonly authMaxPasswordAttempt: number;

    constructor(
        private readonly userRepository: UserRepository,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService
    ) {
        this.uploadPath = this.configService.get<string>('user.uploadPath');
        this.authMaxPasswordAttempt = this.configService.get<number>(
            'auth.password.maxAttempt'
        );
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserEntity[]> {
        return this.userRepository.findAll<IUserEntity>(find, {
            ...options,
            join: true,
        });
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
            email,
            mobileNumber,
            role,
        }: UserCreateDto,
        { passwordExpired, passwordHash, salt, passwordCreated }: IAuthPassword,
        options?: IDatabaseCreateOptions
    ): Promise<UserDoc> {
        const create: UserEntity = new UserEntity();
        create.username = username;
        create.firstName = firstName;
        create.email = email;
        create.password = passwordHash;
        create.role = role;
        create.isActive = true;
        create.inactivePermanent = false;
        create.blocked = false;
        create.lastName = lastName;
        create.salt = salt;
        create.passwordExpired = passwordExpired;
        create.passwordCreated = passwordCreated;
        create.signUpDate = this.helperDateService.create();
        create.passwordAttempt = 0;
        create.mobileNumber = mobileNumber ?? undefined;

        return this.userRepository.create<UserEntity>(create, options);
    }

    async existByEmail(
        email: string,
        options?: IDatabaseExistOptions
    ): Promise<boolean> {
        return this.userRepository.exists(
            {
                email: {
                    $regex: new RegExp(`\\b${email}\\b`),
                    $options: 'i',
                },
            },
            { ...options, withDeleted: true }
        );
    }

    async existByMobileNumber(
        mobileNumber: string,
        options?: IDatabaseExistOptions
    ): Promise<boolean> {
        return this.userRepository.exists(
            {
                mobileNumber,
            },
            { ...options, withDeleted: true }
        );
    }

    async existByUsername(
        username: string,
        options?: IDatabaseExistOptions
    ): Promise<boolean> {
        return this.userRepository.exists(
            { username },
            { ...options, withDeleted: true }
        );
    }

    async delete(repository: UserDoc): Promise<UserDoc> {
        return this.userRepository.softDelete(repository);
    }

    async updateName(
        repository: UserDoc,
        { firstName, lastName }: UserUpdateNameDto
    ): Promise<UserDoc> {
        repository.firstName = firstName;
        repository.lastName = lastName;

        return this.userRepository.save(repository);
    }

    async updatePhoto(
        repository: UserDoc,
        photo: AwsS3Serialization
    ): Promise<UserDoc> {
        repository.photo = photo;

        return this.userRepository.save(repository);
    }

    async updatePassword(
        repository: UserDoc,
        { passwordHash, passwordExpired, salt, passwordCreated }: IAuthPassword
    ): Promise<UserDoc> {
        repository.password = passwordHash;
        repository.passwordExpired = passwordExpired;
        repository.passwordCreated = passwordCreated;
        repository.salt = salt;

        return this.userRepository.save(repository);
    }

    async active(repository: UserDoc): Promise<UserEntity> {
        repository.isActive = true;
        repository.inactiveDate = undefined;

        return this.userRepository.save(repository);
    }

    async inactive(repository: UserDoc): Promise<UserDoc> {
        repository.isActive = false;
        repository.inactiveDate = this.helperDateService.create();

        return this.userRepository.save(repository);
    }

    async blocked(repository: UserDoc): Promise<UserDoc> {
        repository.blocked = true;
        repository.blockedDate = this.helperDateService.create();

        return this.userRepository.save(repository);
    }

    async unblocked(repository: UserDoc): Promise<UserDoc> {
        repository.blocked = false;
        repository.blockedDate = undefined;

        return this.userRepository.save(repository);
    }

    async maxPasswordAttempt(repository: UserDoc): Promise<UserDoc> {
        repository.passwordAttempt = this.authMaxPasswordAttempt;

        return this.userRepository.save(repository);
    }

    async increasePasswordAttempt(repository: UserDoc): Promise<UserDoc> {
        repository.passwordAttempt = ++repository.passwordAttempt;

        return this.userRepository.save(repository);
    }

    async resetPasswordAttempt(repository: UserDoc): Promise<UserDoc> {
        repository.passwordAttempt = 0;

        return this.userRepository.save(repository);
    }

    async updatePasswordExpired(
        repository: UserDoc,
        passwordExpired: Date
    ): Promise<UserDoc> {
        repository.passwordExpired = passwordExpired;

        return this.userRepository.save(repository);
    }

    async joinWithRole(repository: UserDoc): Promise<IUserDoc> {
        return repository.populate({
            path: 'role',
            localField: 'role',
            foreignField: '_id',
            model: RoleEntity.name,
        });
    }

    async createPhotoFilename(): Promise<Record<string, any>> {
        const filename: string = this.helperStringService.random(20);

        return {
            path: this.uploadPath,
            filename: filename,
        };
    }

    async payloadSerialization(
        data: IUserDoc
    ): Promise<UserPayloadSerialization> {
        return plainToInstance(UserPayloadSerialization, data.toObject());
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.userRepository.deleteMany(find, options);
    }
}
