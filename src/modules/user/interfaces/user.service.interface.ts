import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { UserUpdateDto } from 'src/modules/user/dtos/user.update.dto';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserPayloadPermissionSerialization } from 'src/modules/user/serializations/user.payload-permission.serialization';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';
import { IUserCreate, IUserEntity } from './user.interface';

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
        data: IUserCreate,
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

    updateOneById(
        _id: string,
        data: UserUpdateDto,
        options?: IDatabaseOptions
    ): Promise<UserEntity>;

    existEmail(
        email: string,
        options?: IDatabaseExistOptions
    ): Promise<boolean>;

    existMobileNumber(
        mobileNumber: string,
        options?: IDatabaseExistOptions
    ): Promise<boolean>;

    existUsername(
        username: string,
        options?: IDatabaseExistOptions
    ): Promise<boolean>;

    updatePhoto(
        _id: string,
        aws: AwsS3Serialization,
        options?: IDatabaseOptions
    ): Promise<UserEntity>;

    createRandomFilename(): Promise<Record<string, any>>;

    updatePassword(
        _id: string,
        data: IAuthPassword,
        options?: IDatabaseOptions
    ): Promise<UserEntity>;

    updatePasswordExpired(
        _id: string,
        passwordExpired: Date,
        options?: IDatabaseOptions
    ): Promise<UserEntity>;

    inactive(_id: string, options?: IDatabaseOptions): Promise<UserEntity>;

    active(_id: string, options?: IDatabaseOptions): Promise<UserEntity>;

    payloadSerialization(data: IUserEntity): Promise<UserPayloadSerialization>;

    increasePasswordAttempt(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<UserEntity>;

    resetPasswordAttempt(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<UserEntity>;

    getPermissionByGroupFromUser(
        _id: string,
        scope: ENUM_PERMISSION_GROUP[]
    ): Promise<PermissionEntity[]>;

    payloadPermissionSerialization(
        _id: string,
        permissions: PermissionEntity[]
    ): Promise<UserPayloadPermissionSerialization>;
}
