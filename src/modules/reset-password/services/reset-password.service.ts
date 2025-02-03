import { Injectable } from '@nestjs/common';
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
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { ConfigService } from '@nestjs/config';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { ResetPasswordRepository } from 'src/modules/reset-password/repository/repositories/reset-password.repository';
import {
    ResetPasswordDoc,
    ResetPasswordEntity,
} from 'src/modules/reset-password/repository/entities/reset-password.entity';
import { IResetPasswordService } from 'src/modules/reset-password/interfaces/reset-password.service.interface';
import { ENUM_RESET_PASSWORD_TYPE } from 'src/modules/reset-password/enums/reset-password.enum';
import { Duration } from 'luxon';
import { DeleteResult, InsertManyResult, UpdateResult } from 'mongoose';
import { ResetPasswordCreateRequestDto } from 'src/modules/reset-password/dtos/request/reset-password.create.request.dto';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { IResetPasswordRequest } from 'src/modules/reset-password/interfaces/reset-password.interface';
import { ResetPasswordCreteResponseDto } from 'src/modules/reset-password/dtos/response/reset-password.create.response.dto';

@Injectable()
export class ResetPasswordService implements IResetPasswordService {
    private readonly expiredInMinutes: number;
    private readonly otpLength: number;

    private readonly tokenLength: number;

    private readonly referenceLength: number;
    private readonly referencePrefix: string;

    private readonly prefixUrl: string;

    constructor(
        private readonly resetPasswordRepository: ResetPasswordRepository,
        private readonly helperDateService: HelperDateService,
        private readonly helperNumberService: HelperNumberService,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService
    ) {
        this.expiredInMinutes = this.configService.get<number>(
            'resetPassword.expiredInMinutes'
        );
        this.otpLength = this.configService.get<number>(
            'resetPassword.otpLength'
        );

        this.tokenLength = this.configService.get<number>(
            'resetPassword.tokenLength'
        );

        this.referenceLength = this.configService.get<number>(
            'resetPassword.reference.length'
        );
        this.referencePrefix = this.configService.get<string>(
            'resetPassword.reference.prefix'
        );

        this.prefixUrl = this.configService.get<string>(
            'resetPassword.prefixUrl'
        );
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<ResetPasswordDoc[]> {
        return this.resetPasswordRepository.findAll<ResetPasswordDoc>(
            find,
            options
        );
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ResetPasswordDoc> {
        return this.resetPasswordRepository.findOneById<ResetPasswordDoc>(
            _id,
            options
        );
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<ResetPasswordDoc> {
        return this.resetPasswordRepository.findOne<ResetPasswordDoc>(
            find,
            options
        );
    }

    async findOneByToken(
        token: string,
        options?: IDatabaseFindOneOptions
    ): Promise<ResetPasswordDoc> {
        return this.resetPasswordRepository.findOne<ResetPasswordDoc>(
            {
                token,
            },
            options
        );
    }

    async checkActiveLatestEmailByUser(
        user: string,
        options?: IDatabaseFindOneOptions
    ): Promise<IResetPasswordRequest> {
        const check =
            await this.resetPasswordRepository.findOne<ResetPasswordDoc>(
                {
                    user,
                    type: ENUM_RESET_PASSWORD_TYPE.EMAIL,
                    isActive: true,
                    isReset: false,
                    expired: {
                        $gte: this.helperDateService.create(),
                    },
                },
                {
                    ...options,
                    order: {
                        createdAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
                    },
                }
            );

        if (check) {
            return {
                resetPassword: check,
                created: {
                    url: `${this.prefixUrl}/${check.token}`,
                    expiredDate: check.expiredDate,
                    token: check.token,
                    to: this.helperStringService.censor(check.user),
                },
            };
        }

        return;
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.resetPasswordRepository.getTotal(find, options);
    }

    async createEmailByUser(
        user: string,
        email: string,
        options?: IDatabaseCreateOptions
    ): Promise<ResetPasswordDoc> {
        const expired = this.createExpired();
        const reference = this.createReference();
        const otp = this.createOtp();
        const token = this.createToken();

        const create: ResetPasswordEntity = new ResetPasswordEntity();
        create.user = user;
        create.to = email;
        create.type = ENUM_RESET_PASSWORD_TYPE.EMAIL;
        create.expiredDate = expired;
        create.isActive = true;
        create.isReset = false;
        create.reference = reference;
        create.otp = otp;
        create.token = token;
        create.isReset = false;

        return this.resetPasswordRepository.create<ResetPasswordEntity>(
            create,
            options
        );
    }

    async requestEmailByUser(
        user: string,
        { email }: ResetPasswordCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<IResetPasswordRequest> {
        const created = await this.createEmailByUser(user, email, options);

        return {
            resetPassword: created,
            created: {
                url: `${this.prefixUrl}/${created.token}`,
                expiredDate: created.expiredDate,
                token: created.token,
                to: this.helperStringService.censor(email),
            },
        };
    }

    async delete(
        repository: ResetPasswordDoc,
        options?: IDatabaseSaveOptions
    ): Promise<ResetPasswordDoc> {
        return this.resetPasswordRepository.delete(repository, options);
    }

    async reset(
        repository: ResetPasswordDoc,
        options?: IDatabaseSaveOptions
    ): Promise<ResetPasswordDoc> {
        repository.resetDate = this.helperDateService.create();
        repository.isReset = true;

        return this.resetPasswordRepository.save(repository, options);
    }

    async verify(
        repository: ResetPasswordDoc,
        options?: IDatabaseSaveOptions
    ): Promise<ResetPasswordDoc> {
        repository.verifyDate = this.helperDateService.create();
        repository.isActive = false;

        return this.resetPasswordRepository.save(repository, options);
    }

    async inactive(
        repository: ResetPasswordDoc,
        options?: IDatabaseSaveOptions
    ): Promise<ResetPasswordDoc> {
        repository.isActive = false;

        return this.resetPasswordRepository.save(repository, options);
    }

    async inactiveEmailManyByUser(
        user: string,
        options?: IDatabaseUpdateManyOptions
    ): Promise<UpdateResult> {
        const today = this.helperDateService.create();
        return this.resetPasswordRepository.updateMany(
            { user, type: ENUM_RESET_PASSWORD_TYPE.EMAIL },
            { isActive: false, expiredDate: today },
            options
        );
    }

    async createMany(
        data: ResetPasswordEntity[],
        options?: IDatabaseCreateManyOptions
    ): Promise<InsertManyResult<ResetPasswordEntity>> {
        return this.resetPasswordRepository.createMany(data, options);
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<DeleteResult> {
        return this.resetPasswordRepository.deleteMany(find, options);
    }

    mapResetPasswordResponse(
        resetPassword: ResetPasswordDoc,
        { email }: ResetPasswordCreateRequestDto
    ): ResetPasswordCreteResponseDto {
        return {
            url: `${this.prefixUrl}/${resetPassword.token}`,
            expiredDate: resetPassword.expiredDate,
            token: resetPassword.token,
            to: this.helperStringService.censor(email),
        };
    }

    createOtp(): string {
        return this.helperNumberService.random(this.otpLength).toString();
    }

    createExpired(): Date {
        const today = this.helperDateService.create();
        return this.helperDateService.forward(
            today,
            Duration.fromObject({
                minutes: this.expiredInMinutes,
            })
        );
    }

    createReference(): string {
        const random = this.helperStringService.randomReference(
            this.referenceLength
        );

        return `${this.referencePrefix}-${random}`;
    }

    checkExpired(expired: Date): boolean {
        const today: Date = this.helperDateService.create();
        return today > expired;
    }

    createToken(): string {
        return this.helperStringService.random(this.tokenLength);
    }

    checkToken(token1: string, token2: string): boolean {
        return token1 === token2;
    }

    checkOtp(otp1: string, otp2: string): boolean {
        return otp1 === otp2;
    }
}
