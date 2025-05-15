import { DeleteResult, UpdateResult } from 'mongoose';
import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseSaveOptions,
    IDatabaseUpdateManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { UserDoc } from 'src/modules/user/repository/entities/user.entity';
import { VerificationResponse } from 'src/modules/verification/dtos/response/verification.response';
import { VerificationDoc } from 'src/modules/verification/repository/entity/verification.entity';

export interface IVerificationService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<VerificationDoc[]>;
    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<VerificationDoc>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<VerificationDoc>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    createEmailByUser(
        user: UserDoc,
        options?: IDatabaseCreateOptions
    ): Promise<VerificationDoc>;
    createMobileNumberByUser(
        user: UserDoc,
        options?: IDatabaseCreateOptions
    ): Promise<VerificationDoc>;
    findOneLatestEmailByUser(
        user: string,
        options?: IDatabaseFindOneOptions
    ): Promise<VerificationDoc>;
    findOneLatestMobileNumberByUser(
        user: string,
        options?: IDatabaseFindOneOptions
    ): Promise<VerificationDoc>;
    validateOtp(verification: VerificationDoc, otp: string): boolean;
    verify(
        repository: VerificationDoc,
        options?: IDatabaseSaveOptions
    ): Promise<VerificationDoc>;
    inactiveEmailManyByUser(
        user: string,
        options?: IDatabaseUpdateManyOptions
    ): Promise<UpdateResult>;
    inactiveMobileNumberManyByUser(
        user: string,
        options?: IDatabaseUpdateManyOptions
    ): Promise<UpdateResult>;
    createOtp(): string;
    createExpiredDate(): Date;
    createReference(): string;
    map(verification: VerificationDoc): VerificationResponse;
    deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseUpdateManyOptions
    ): Promise<DeleteResult>;
}
