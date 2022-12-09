import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { UserActiveDto } from 'src/modules/user/dtos/user.active.dto';
import { UserPasswordAttemptDto } from 'src/modules/user/dtos/user.password-attempt.dto';
import { UserPasswordExpiredDto } from 'src/modules/user/dtos/user.password-expired.dto';
import { UserPasswordDto } from 'src/modules/user/dtos/user.password.dto';
import { UserPhotoDto } from 'src/modules/user/dtos/user.photo.dto';
import { UserUpdateDto } from 'src/modules/user/dtos/user.update.dto';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

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
        data: UserEntity,
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
        data: UserPhotoDto,
        options?: IDatabaseOptions
    ): Promise<UserEntity>;

    updatePassword(
        _id: string,
        data: UserPasswordDto,
        options?: IDatabaseOptions
    ): Promise<UserEntity>;

    updatePasswordExpired(
        _id: string,
        data: UserPasswordExpiredDto,
        options?: IDatabaseOptions
    ): Promise<UserEntity>;

    updateIsActive(
        _id: string,
        data: UserActiveDto,
        options?: IDatabaseOptions
    ): Promise<UserEntity>;

    updatePasswordAttempt(
        _id: string,
        data: UserPasswordAttemptDto,
        options?: IDatabaseOptions
    ): Promise<UserEntity>;
}
