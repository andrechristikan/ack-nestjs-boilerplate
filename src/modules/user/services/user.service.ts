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
import { IUserDoc } from 'src/modules/user/interfaces/user.interface';
import { plainToInstance } from 'class-transformer';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import {
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_STATUS,
} from 'src/modules/user/constants/user.enum.constant';
import { UserCreateRequestDto } from 'src/modules/user/dtos/request/user.create.request.dto';
import { AwsS3Dto } from 'src/common/aws/dtos/aws.s3.dto';
import { UserUpdatePasswordAttemptRequestDto } from 'src/modules/user/dtos/request/user.update-password-attempt.request.dto';
import { ENUM_AUTH_LOGIN_FROM } from 'src/common/auth/constants/auth.enum.constant';
import { AuthJwtAccessPayloadDto } from 'src/common/auth/dtos/jwt/auth.jwt.access-payload.dto';
import { UserUpdateProfileRequestDto } from 'src/modules/user/dtos/request/user.update-profile.request.dto';
import { UserGetResponseDto } from 'src/modules/user/dtos/response/user.get.response.dto';
import { UserListResponseDto } from 'src/modules/user/dtos/response/user.list.response.dto';
import { UserProfileResponseDto } from 'src/modules/user/dtos/response/user.profile.response.dto';

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

    async findAllWithRoles(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserDoc[]> {
        return this.userRepository.findAll<IUserDoc>(find, {
            ...options,
            join: true,
        });
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

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.userRepository.getTotal(find, options);
    }

    async create(
        role: string,
        { email, mobileNumber, firstName, lastName }: UserCreateRequestDto,
        { passwordExpired, passwordHash, salt, passwordCreated }: IAuthPassword,
        signUpFrom: ENUM_USER_SIGN_UP_FROM,
        options?: IDatabaseCreateOptions
    ): Promise<UserDoc> {
        const create: UserEntity = new UserEntity();
        create.firstName = firstName;
        create.lastName = lastName;
        create.email = email ?? undefined;
        create.mobileNumber = mobileNumber;
        create.role = role;
        create.status = ENUM_USER_STATUS.ACTIVE;
        create.blocked = false;
        create.password = passwordHash;
        create.salt = salt;
        create.passwordExpired = passwordExpired;
        create.passwordCreated = passwordCreated;
        create.passwordAttempt = 0;
        create.signUpDate = this.helperDateService.create();
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

        return this.userRepository.save(repository, options);
    }

    async blocked(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.blocked = true;

        return this.userRepository.save(repository, options);
    }

    async unblocked(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.blocked = false;

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

    async joinWithRole(repository: UserDoc): Promise<IUserDoc> {
        return repository.populate({
            path: 'role',
            localField: 'role',
            foreignField: '_id',
            model: RoleEntity.name,
        });
    }
    async getPhotoUploadPath(user: string): Promise<string> {
        return this.uploadPath.replace('{user}', user);
    }

    async mapPayload(
        data: IUserDoc,
        loginFrom: ENUM_AUTH_LOGIN_FROM
    ): Promise<AuthJwtAccessPayloadDto> {
        const loginDate = this.helperDateService.create();

        return plainToInstance(AuthJwtAccessPayloadDto, {
            _id: data._id,
            type: data.role.type,
            role: data.role._id,
            permissions: data.role.permissions,
            loginDate,
            loginFrom,
        });
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean> {
        return this.userRepository.deleteMany(find, options);
    }

    async findOneByIdAndActive(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<IUserDoc> {
        return this.userRepository.findOne<IUserDoc>(
            { _id, status: ENUM_USER_STATUS.ACTIVE, blocked: false },
            {
                ...options,
                join: {
                    path: 'role',
                    localField: 'role',
                    foreignField: '_id',
                    match: {
                        isActive: true,
                    },
                    model: RoleEntity.name,
                },
            }
        );
    }

    async findOneByEmailAndActive(
        email: string,
        options?: IDatabaseFindOneOptions
    ): Promise<IUserDoc> {
        return this.userRepository.findOne<IUserDoc>(
            { email, status: ENUM_USER_STATUS.ACTIVE, blocked: false },
            {
                ...options,
                join: {
                    path: 'role',
                    localField: 'role',
                    foreignField: '_id',
                    match: {
                        isActive: true,
                    },
                    model: RoleEntity.name,
                },
            }
        );
    }

    async findOneByMobileNumberAndActive(
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
                join: {
                    path: 'role',
                    localField: 'role',
                    foreignField: '_id',
                    match: {
                        isActive: true,
                    },
                    model: RoleEntity.name,
                },
            }
        );
    }

    async mapProfile(user: IUserDoc): Promise<UserProfileResponseDto> {
        return plainToInstance(UserProfileResponseDto, user.toObject());
    }

    async updateProfile(
        repository: UserDoc,
        { firstName, lastName, address }: UserUpdateProfileRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.firstName = firstName;
        repository.lastName = lastName;
        repository.address = address;

        return this.userRepository.save(repository, options);
    }

    async mapList(user: IUserDoc[]): Promise<UserListResponseDto[]> {
        return plainToInstance(
            UserListResponseDto,
            user.map(u => u.toObject())
        );
    }

    async mapGet(user: IUserDoc): Promise<UserGetResponseDto> {
        return plainToInstance(UserGetResponseDto, user.toObject());
    }
}
