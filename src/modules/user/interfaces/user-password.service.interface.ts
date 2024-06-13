import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
} from 'src/common/database/interfaces/database.interface';
import { UserPasswordListResponseDto } from 'src/modules/user/dtos/response/user-password.list.response.dto';
import { UserPasswordDoc } from 'src/modules/user/repository/entities/user-password.entity';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';

export interface IUserPasswordService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserPasswordDoc[]>;
    findAllByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserPasswordDoc[]>;
    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserPasswordDoc>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<UserPasswordDoc>;
    findOneByUser(
        user: UserDoc,
        password: IAuthPassword,
        options?: IDatabaseFindOneOptions
    ): Promise<UserPasswordDoc>;
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
        options?: IDatabaseCreateOptions
    ): Promise<UserPasswordDoc>;
    createByAdmin(
        user: UserDoc,
        by: string,
        options?: IDatabaseCreateOptions
    ): Promise<UserPasswordDoc>;
    mapList(
        userHistories: UserPasswordDoc[]
    ): Promise<UserPasswordListResponseDto[]>;
    checkPasswordPeriodByUser(
        user: UserDoc,
        password: IAuthPassword,
        options?: IDatabaseFindOneOptions
    ): Promise<boolean>;
    getPasswordPeriod(): Promise<number>;
}
