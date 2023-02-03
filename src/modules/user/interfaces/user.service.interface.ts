import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
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
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserPayloadPermissionSerialization } from 'src/modules/user/serializations/user.payload-permission.serialization';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';

export interface IUserService {
    findAll<T>(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<T[]>;

    findOneById<T>(_id: string, options?: IDatabaseFindOneOptions): Promise<T>;

    findOne<T>(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<T>;

    findOneByUsername<T>(
        username: string,
        options?: IDatabaseFindOneOptions
    ): Promise<T>;

    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number>;

    create(
        data: UserCreateDto,
        dataPassword: IAuthPassword,
        options?: IDatabaseCreateOptions
    ): Promise<UserEntity>;

    deleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<UserEntity>;

    deleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<UserEntity>;

    updateName(
        _id: string,
        data: UserUpdateNameDto,
        options?: IDatabaseOptions
    ): Promise<UserEntity>;

    updatePhoto(
        _id: string,
        photo: AwsS3Serialization,
        options?: IDatabaseOptions
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

    updatePassword(
        _id: string,
        { passwordHash, passwordExpired, salt }: IAuthPassword,
        options?: IDatabaseOptions
    ): Promise<UserEntity>;

    active(_id: string, options?: IDatabaseOptions): Promise<UserEntity>;

    inactive(_id: string, options?: IDatabaseOptions): Promise<UserEntity>;

    blocked(_id: string, options?: IDatabaseOptions): Promise<UserEntity>;

    maxPasswordAttempt(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<UserEntity>;

    increasePasswordAttempt(
        user: UserEntity | IUserEntity,
        options?: IDatabaseOptions
    ): Promise<UserEntity>;

    resetPasswordAttempt(
        _id: string,
        options?: IDatabaseOptions
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

    updatePasswordExpired(
        _id: string,
        passwordExpired: Date,
        options?: IDatabaseOptions
    ): Promise<UserEntity>;
}
