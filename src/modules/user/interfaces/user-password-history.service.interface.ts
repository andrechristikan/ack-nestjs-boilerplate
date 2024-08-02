import { IAuthPassword } from 'src/modules/auth/interfaces/auth.interface';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
} from 'src/common/database/interfaces/database.interface';
import {
    IUserPasswordHistoryDoc,
    IUserPasswordHistoryEntity,
} from 'src/modules/user/interfaces/user.interface';
import { UserPasswordHistoryDoc } from 'src/modules/user/repository/entities/user-password-history.entity';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import {
    UserCreatePasswordByAdminRequestDto,
    UserCreatePasswordRequestDto,
} from 'src/modules/user/dtos/request/user.create-password.request.dto';
import { UserPasswordHistoryListResponseDto } from 'src/modules/user/dtos/response/user-password-history.list.response.dto';

export interface IUserPasswordHistoryService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserPasswordHistoryDoc[]>;
    findAllByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserPasswordHistoryDoc[]>;
    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserPasswordHistoryDoc>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<UserPasswordHistoryDoc>;
    findOneByUser(
        user: UserDoc,
        password: IAuthPassword,
        options?: IDatabaseFindOneOptions
    ): Promise<UserPasswordHistoryDoc>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    getTotalByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    createByUser(
        user: UserDoc,
        { type }: UserCreatePasswordRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<UserPasswordHistoryDoc>;
    createByAdmin(
        user: UserDoc,
        { type, by }: UserCreatePasswordByAdminRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<UserPasswordHistoryDoc>;
    checkPasswordPeriodByUser(
        user: UserDoc,
        password: IAuthPassword,
        options?: IDatabaseFindOneOptions
    ): Promise<boolean>;
    getPasswordPeriod(): Promise<number>;
    mapList(
        userHistories: IUserPasswordHistoryDoc[] | IUserPasswordHistoryEntity[]
    ): Promise<UserPasswordHistoryListResponseDto[]>;
}
