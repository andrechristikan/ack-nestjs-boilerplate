import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { UserUpdateDto } from 'src/modules/user/dtos/user.update.dto';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { IUserCreate } from './user.interface';

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
}
