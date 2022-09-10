import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import { IAwsS3 } from 'src/common/aws/interfaces/aws.interface';
import {
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { UserUpdateDto } from 'src/modules/user/dtos/user.update.dto';
import { UserDocument } from 'src/modules/user/schemas/user.schema';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';
import { IUserCheckExist, IUserCreate, IUserDocument } from './user.interface';

export interface IUserService {
    findAll<T>(
        find: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<T[]>;

    findOneById<T>(_id: string, options?: IDatabaseFindOneOptions): Promise<T>;

    findOne<T>(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<T>;

    getTotal(find: Record<string, any>): Promise<number>;

    create(
        data: IUserCreate,
        options?: IDatabaseOptions
    ): Promise<UserDocument>;

    deleteOneById(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<UserDocument>;

    deleteOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<UserDocument>;

    updateOneById(
        _id: string,
        data: UserUpdateDto,
        options?: IDatabaseOptions
    ): Promise<UserDocument>;

    checkExist(
        email: string,
        mobileNumber: string,
        excludeId?: string
    ): Promise<IUserCheckExist>;

    updatePhoto(
        _id: string,
        aws: IAwsS3,
        options?: IDatabaseOptions
    ): Promise<UserDocument>;

    createRandomFilename(): Promise<Record<string, any>>;

    updatePassword(
        _id: string,
        data: IAuthPassword,
        options?: IDatabaseOptions
    ): Promise<UserDocument>;

    updatePasswordExpired(
        _id: string,
        passwordExpired: Date,
        options?: IDatabaseOptions
    ): Promise<UserDocument>;

    inactive(_id: string, options?: IDatabaseOptions): Promise<UserDocument>;

    active(_id: string, options?: IDatabaseOptions): Promise<UserDocument>;

    payloadSerialization(
        data: IUserDocument
    ): Promise<UserPayloadSerialization>;
}
