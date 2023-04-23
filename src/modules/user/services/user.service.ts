import { Injectable } from '@nestjs/common';
import { IUserService } from 'src/modules/user/interfaces/user.service.interface';
import {
    IDatabaseCreateOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseManyOptions,
    IDatabaseCreateManyOptions,
    IDatabaseSaveOptions,
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
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { UserImportDto } from 'src/modules/user/dtos/user.import.dto';
import { UserUpdateUsernameDto } from 'src/modules/user/dtos/user.update-username.dto';
import { UserUpdateGoogleSSODto } from 'src/modules/user/dtos/user.update-google-sso.dto';

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

    async findOneByEmail<T>(
        email: string,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        return this.userRepository.findOne<T>({ email }, options);
    }

    async findOneByMobileNumber<T>(
        mobileNumber: string,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        return this.userRepository.findOne<T>({ mobileNumber }, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.userRepository.getTotal(find, { ...options, join: true });
    }

    async create(
        {
            firstName,
            lastName,
            email,
            mobileNumber,
            role,
            signUpFrom,
        }: UserCreateDto,
        { passwordExpired, passwordHash, salt, passwordCreated }: IAuthPassword,
        options?: IDatabaseCreateOptions
    ): Promise<UserDoc> {
        const create: UserEntity = new UserEntity();
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
        create.signUpFrom = signUpFrom;

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

    async delete(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        return this.userRepository.softDelete(repository, options);
    }

    async updateName(
        repository: UserDoc,
        { firstName, lastName }: UserUpdateNameDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.firstName = firstName;
        repository.lastName = lastName;

        return this.userRepository.save(repository, options);
    }

    async updateUsername(
        repository: UserDoc,
        { username }: UserUpdateUsernameDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.username = username;

        return this.userRepository.save(repository, options);
    }

    async updateGoogleSSO(
        repository: UserDoc,
        { accessToken, refreshToken }: UserUpdateGoogleSSODto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.google = {
            accessToken,
            refreshToken,
        };

        return this.userRepository.save(repository, options);
    }

    async updatePhoto(
        repository: UserDoc,
        photo: AwsS3Serialization,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.photo = photo;

        return this.userRepository.save(repository, options);
    }

    async updatePassword(
        repository: UserDoc,
        { passwordHash, passwordExpired, salt, passwordCreated }: IAuthPassword,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.password = passwordHash;
        repository.passwordExpired = passwordExpired;
        repository.passwordCreated = passwordCreated;
        repository.salt = salt;

        return this.userRepository.save(repository, options);
    }

    async active(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserEntity> {
        repository.isActive = true;
        repository.inactiveDate = undefined;

        return this.userRepository.save(repository, options);
    }

    async inactive(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.isActive = false;
        repository.inactiveDate = this.helperDateService.create();

        return this.userRepository.save(repository, options);
    }

    async inactivePermanent(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.isActive = false;
        repository.inactivePermanent = true;
        repository.inactiveDate = this.helperDateService.create();

        return this.userRepository.save(repository, options);
    }

    async blocked(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.blocked = true;
        repository.blockedDate = this.helperDateService.create();

        return this.userRepository.save(repository, options);
    }

    async unblocked(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.blocked = false;
        repository.blockedDate = undefined;

        return this.userRepository.save(repository, options);
    }

    async maxPasswordAttempt(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.passwordAttempt = this.authMaxPasswordAttempt;

        return this.userRepository.save(repository, options);
    }

    async increasePasswordAttempt(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.passwordAttempt = ++repository.passwordAttempt;

        return this.userRepository.save(repository, options);
    }

    async resetPasswordAttempt(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.passwordAttempt = 0;

        return this.userRepository.save(repository, options);
    }

    async updatePasswordExpired(
        repository: UserDoc,
        passwordExpired: Date,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.passwordExpired = passwordExpired;

        return this.userRepository.save(repository, options);
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

    async import(
        data: UserImportDto[],
        role: string,
        { passwordCreated, passwordHash, salt }: IAuthPassword,
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean> {
        const passwordExpired: Date = this.helperDateService.backwardInDays(1);
        const users: UserEntity[] = data.map(
            ({ email, firstName, lastName, mobileNumber, signUpFrom }) => {
                const create: UserEntity = new UserEntity();
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
                create.signUpFrom = signUpFrom;

                return create;
            }
        );

        return this.userRepository.createMany<UserEntity>(users, options);
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.userRepository.deleteMany(find, options);
    }
}
