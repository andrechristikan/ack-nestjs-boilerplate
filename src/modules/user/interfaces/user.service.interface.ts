import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import {
    IDatabaseCreateOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
    IDatabaseManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { UserCreateDto } from 'src/modules/user/dtos/user.create.dto';
import { UserUpdateNameDto } from 'src/modules/user/dtos/user.update-name.dto';
import { IUserEntity } from 'src/modules/user/interfaces/user.interface';
import {
    UserDoc,
    UserEntity,
} from 'src/modules/user/repository/entities/user.entity';
import { UserPayloadPermissionSerialization } from 'src/modules/user/serializations/user.payload-permission.serialization';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';

export interface IUserService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserEntity[]>;

    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserDoc>;

    findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<UserDoc>;

    findOneByUsername(
        username: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserDoc>;

    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number>;

    create(
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
    ): Promise<UserEntity>;

    existByEmail(
        email: string,
        options?: IDatabaseExistOptions
    ): Promise<boolean>;

    existByMobileNumber(
        mobileNumber: string,
        options?: IDatabaseExistOptions
    ): Promise<boolean>;

    existByUsername(
        username: string,
        options?: IDatabaseExistOptions
    ): Promise<boolean>;

    delete(repository: UserDoc): Promise<UserDoc>;

    updateName(
        repository: UserDoc,
        { firstName, lastName }: UserUpdateNameDto
    ): Promise<UserDoc>;

    updatePhoto(
        repository: UserDoc,
        photo: AwsS3Serialization
    ): Promise<UserDoc>;

    updatePassword(
        repository: UserDoc,
        { passwordHash, passwordExpired, salt, passwordCreated }: IAuthPassword
    ): Promise<UserDoc>;

    active(repository: UserDoc): Promise<UserEntity>;

    inactive(repository: UserDoc): Promise<UserEntity>;

    blocked(repository: UserDoc): Promise<UserEntity>;

    unblocked(repository: UserDoc): Promise<UserEntity>;

    maxPasswordAttempt(repository: UserDoc): Promise<UserEntity>;

    increasePasswordAttempt(repository: UserDoc): Promise<UserEntity>;

    resetPasswordAttempt(repository: UserDoc): Promise<UserEntity>;

    updatePasswordExpired(
        repository: UserDoc,
        passwordExpired: Date
    ): Promise<UserEntity>;

    createPhotoFilename(): Promise<Record<string, any>>;

    payloadSerialization(data: IUserEntity): Promise<UserPayloadSerialization>;

    payloadPermissionSerialization(
        _id: string,
        permissions: PermissionEntity[]
    ): Promise<UserPayloadPermissionSerialization>;

    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean>;
}
