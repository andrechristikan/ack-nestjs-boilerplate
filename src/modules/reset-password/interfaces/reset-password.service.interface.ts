import { DeleteResult, InsertManyResult, UpdateResult } from 'mongoose';
import {
    IDatabaseCreateManyOptions,
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseSaveOptions,
    IDatabaseUpdateManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { ResetPasswordCreateRequestDto } from 'src/modules/reset-password/dtos/request/reset-password.create.request.dto';
import { IResetPasswordRequest } from 'src/modules/reset-password/interfaces/reset-password.interface';
import {
    ResetPasswordDoc,
    ResetPasswordEntity,
} from 'src/modules/reset-password/repository/entities/reset-password.entity';

export interface IResetPasswordService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ResetPasswordDoc[]>;
    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ResetPasswordDoc>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<ResetPasswordDoc>;
    findOneByToken(
        token: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ResetPasswordDoc>;
    checkActiveLatestEmailByUser(
        user: string,
        options?: IDatabaseFindOneOptions
    ): Promise<IResetPasswordRequest>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    createEmailByUser(
        user: string,
        email: string,
        options?: IDatabaseCreateOptions
    ): Promise<ResetPasswordDoc>;
    requestEmailByUser(
        user: string,
        { email }: ResetPasswordCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<IResetPasswordRequest>;
    delete(
        repository: ResetPasswordDoc,
        options?: IDatabaseSaveOptions
    ): Promise<ResetPasswordDoc>;
    reset(
        repository: ResetPasswordDoc,
        options?: IDatabaseSaveOptions
    ): Promise<ResetPasswordDoc>;
    verify(
        repository: ResetPasswordDoc,
        options?: IDatabaseSaveOptions
    ): Promise<ResetPasswordDoc>;
    inactive(
        repository: ResetPasswordDoc,
        options?: IDatabaseSaveOptions
    ): Promise<ResetPasswordDoc>;
    inactiveEmailManyByUser(
        user: string,
        options?: IDatabaseUpdateManyOptions
    ): Promise<UpdateResult>;
    createMany(
        data: ResetPasswordEntity[],
        options?: IDatabaseCreateManyOptions
    ): Promise<InsertManyResult<ResetPasswordEntity>>;
    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<DeleteResult>;
    createOtp(): string;
    createExpired(): Date;
    createReference(): string;
    checkExpired(expired: Date): boolean;
    createToken(): string;
    checkToken(token1: string, token2: string): boolean;
    checkOtp(otp1: string, otp2: string): boolean;
}
