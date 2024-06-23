import { Injectable } from '@nestjs/common';
import { IUserService } from 'src/modules/user/interfaces/user.service.interface';
import {
    IDatabaseCreateOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseManyOptions,
    IDatabaseSaveOptions,
} from 'src/common/database/interfaces/database.interface';
import {
    UserDoc,
    UserEntity,
} from 'src/modules/user/repository/entities/user.entity';
import { UserRepository } from 'src/modules/user/repository/repositories/user.repository';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { ConfigService } from '@nestjs/config';
import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import {
    IUserDoc,
    IUserEntity,
} from 'src/modules/user/interfaces/user.interface';
import { plainToInstance } from 'class-transformer';
import {
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_STATUS,
} from 'src/modules/user/constants/user.enum.constant';
import { UserCreateRequestDto } from 'src/modules/user/dtos/request/user.create.request.dto';
import { AwsS3Dto } from 'src/common/aws/dtos/aws.s3.dto';
import { UserUpdatePasswordAttemptRequestDto } from 'src/modules/user/dtos/request/user.update-password-attempt.request.dto';
import { UserGetResponseDto } from 'src/modules/user/dtos/response/user.get.response.dto';
import { UserListResponseDto } from 'src/modules/user/dtos/response/user.list.response.dto';
import { UserProfileResponseDto } from 'src/modules/user/dtos/response/user.profile.response.dto';
import { UserUpdateRequestDto } from 'src/modules/user/dtos/request/user.update.request.dto';
import { UserShortResponseDto } from 'src/modules/user/dtos/response/user.short.response.dto';
import { UserUpdateMobileNumberRequestDto } from 'src/modules/user/dtos/request/user.update-mobile-number.request.dto';
import { UserSignUpRequestDto } from 'src/modules/user/dtos/request/user.sign-up.request.dto';
import { Document } from 'mongoose';

@Injectable()
export class UserService implements IUserService {
    private readonly uploadPath: string;

    constructor(
        private readonly userRepository: UserRepository,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.uploadPath = this.configService.get<string>('user.uploadPath');
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserDoc[]> {
        return this.userRepository.findAll<UserDoc>(find, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.userRepository.getTotal(find, options);
    }

    async findAllActive(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserDoc[]> {
        return this.userRepository.findAll<UserDoc>(
            { ...find, status: ENUM_USER_STATUS.ACTIVE, blocked: false },
            options
        );
    }

    async findAllWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserDoc[]> {
        return this.userRepository.findAll<IUserDoc>(find, {
            ...options,
            join: true,
        });
    }

    async findAllActiveWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserDoc[]> {
        return this.userRepository.findAll<IUserDoc>(
            { ...find, status: ENUM_USER_STATUS.ACTIVE, blocked: false },
            { ...options, join: true }
        );
    }

    async getTotalActive(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.userRepository.getTotal(
            { ...find, status: ENUM_USER_STATUS.ACTIVE, blocked: false },
            options
        );
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserDoc> {
        return this.userRepository.findOneById<UserDoc>(_id, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<UserDoc> {
        return this.userRepository.findOne<UserDoc>(find, options);
    }

    async findOneByEmail(
        email: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserDoc> {
        return this.userRepository.findOne<UserDoc>({ email }, options);
    }

    async findOneByMobileNumber(
        mobileNumber: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserDoc> {
        return this.userRepository.findOne<UserDoc>({ mobileNumber }, options);
    }

    async findOneActiveById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<IUserDoc> {
        return this.userRepository.findOne<IUserDoc>(
            { _id, status: ENUM_USER_STATUS.ACTIVE, blocked: false },
            {
                ...options,
                join: this.userRepository._joinSchemaActive,
            }
        );
    }

    async findOneActiveByEmail(
        email: string,
        options?: IDatabaseFindOneOptions
    ): Promise<IUserDoc> {
        return this.userRepository.findOne<IUserDoc>(
            { email, status: ENUM_USER_STATUS.ACTIVE, blocked: false },
            {
                ...options,
                join: this.userRepository._joinSchemaActive,
            }
        );
    }

    async findOneActiveByMobileNumber(
        mobileNumber: string,
        options?: IDatabaseFindOneOptions
    ): Promise<IUserDoc> {
        return this.userRepository.findOne<IUserDoc>(
            {
                mobileNumber,
                status: ENUM_USER_STATUS.ACTIVE,
                blocked: false,
            },
            {
                ...options,
                join: this.userRepository._joinSchemaActive,
            }
        );
    }

    async findOneWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserDoc> {
        return this.userRepository.findOne<IUserDoc>(find, {
            ...options,
            join: true,
        });
    }

    async findOneWithRoleAndCountryById(
        _id: string,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserDoc> {
        return this.userRepository.findOneById<IUserDoc>(_id, {
            ...options,
            join: true,
        });
    }

    async create(
        { email, name, role, country }: UserCreateRequestDto,
        { passwordExpired, passwordHash, salt, passwordCreated }: IAuthPassword,
        signUpFrom: ENUM_USER_SIGN_UP_FROM,
        options?: IDatabaseCreateOptions
    ): Promise<UserDoc> {
        const create: UserEntity = new UserEntity();
        create.name = name;
        create.email = email;
        create.role = role;
        create.status = ENUM_USER_STATUS.ACTIVE;
        create.password = passwordHash;
        create.salt = salt;
        create.passwordExpired = passwordExpired;
        create.passwordCreated = passwordCreated;
        create.passwordAttempt = 0;
        create.signUpDate = this.helperDateService.create();
        create.signUpFrom = signUpFrom;
        create.country = country;

        return this.userRepository.create<UserEntity>(create, options);
    }

    async signUp(
        role: string,
        { email, name, country }: UserSignUpRequestDto,
        { passwordExpired, passwordHash, salt, passwordCreated }: IAuthPassword,
        options?: IDatabaseCreateOptions
    ): Promise<UserDoc> {
        const create: UserEntity = new UserEntity();
        create.name = name;
        create.email = email;
        create.role = role;
        create.status = ENUM_USER_STATUS.ACTIVE;
        create.password = passwordHash;
        create.salt = salt;
        create.passwordExpired = passwordExpired;
        create.passwordCreated = passwordCreated;
        create.passwordAttempt = 0;
        create.signUpDate = this.helperDateService.create();
        create.signUpFrom = ENUM_USER_SIGN_UP_FROM.PUBLIC;
        create.country = country;

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

    async updatePhoto(
        repository: UserDoc,
        photo: AwsS3Dto,
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
        repository.status = ENUM_USER_STATUS.ACTIVE;

        return this.userRepository.save(repository, options);
    }

    async inactive(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.status = ENUM_USER_STATUS.INACTIVE;

        return this.userRepository.save(repository, options);
    }

    async selfDelete(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.status = ENUM_USER_STATUS.DELETED;
        repository.selfDeletion = true;
        repository.deletedAt = this.helperDateService.create();

        return this.userRepository.save(repository, options);
    }

    async blocked(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.status = ENUM_USER_STATUS.BLOCKED;

        return this.userRepository.save(repository, options);
    }

    async updatePasswordAttempt(
        repository: UserDoc,
        { passwordAttempt }: UserUpdatePasswordAttemptRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.passwordAttempt = passwordAttempt;

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

    async join(repository: UserDoc): Promise<IUserDoc> {
        return this.userRepository.join(
            repository,
            this.userRepository._joinOnFind
        );
    }

    async getPhotoUploadPath(user: string): Promise<string> {
        return this.uploadPath.replace('{user}', user);
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.userRepository.deleteMany(find, options);
    }

    async update(
        repository: UserDoc,
        { country, name }: UserUpdateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.country = country;
        repository.name = name;

        return this.userRepository.save(repository, options);
    }

    async updateMobileNumber(
        repository: UserDoc,
        { country, number }: UserUpdateMobileNumberRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.mobileNumber = {
            country,
            number,
        };

        return this.userRepository.save(repository, options);
    }

    async deleteMobileNumber(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.mobileNumber = undefined;

        return this.userRepository.save(repository, options);
    }

    async mapProfile(
        user: IUserDoc | IUserEntity
    ): Promise<UserProfileResponseDto> {
        return plainToInstance(
            UserProfileResponseDto,
            user instanceof Document ? user.toObject() : user
        );
    }

    async mapList(
        users: IUserDoc[] | IUserEntity[]
    ): Promise<UserListResponseDto[]> {
        return plainToInstance(
            UserListResponseDto,
            users.map((u: IUserDoc | IUserEntity) =>
                u instanceof Document ? u.toObject() : u
            )
        );
    }

    async mapShort(
        users: IUserDoc[] | IUserEntity[]
    ): Promise<UserShortResponseDto[]> {
        return plainToInstance(
            UserShortResponseDto,
            users.map((u: IUserDoc | IUserEntity) =>
                u instanceof Document ? u.toObject() : u
            )
        );
    }

    async mapGet(user: IUserDoc | IUserEntity): Promise<UserGetResponseDto> {
        return plainToInstance(
            UserGetResponseDto,
            user instanceof Document ? user.toObject() : user
        );
    }
}
