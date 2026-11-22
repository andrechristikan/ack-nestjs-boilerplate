import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumPasswordHistoryType } from '@generated/prisma-client/client';
import type { PasswordHistory } from '@generated/prisma-client/client';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import type {
    IPasswordHistoryCreate,
    IPasswordHistoryList,
} from '@modules/password-history/interfaces/password-history.interface';
import { PasswordHistoryMustNewException } from '@modules/password-history/exceptions/password-history.must-new.exception';
import { PasswordHistoryRepository } from '@modules/password-history/repositories/password-history.repository';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PasswordHistoryService {
    private readonly periodInDays: number;

    constructor(
        private readonly passwordHistoryRepository: PasswordHistoryRepository,
        private readonly helperHashService: HelperHashService,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.periodInDays = this.configService.get<number>(
            'auth.password.periodInDays'
        )!;
    }

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IPasswordHistoryList>> {
        return this.passwordHistoryRepository.findWithPaginationOffsetByAdmin(
            userId,
            pagination
        );
    }

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePaginationReturn<IPasswordHistoryList>> {
        return this.passwordHistoryRepository.findWithPaginationCursor(
            userId,
            pagination
        );
    }

    async assertNew(userId: string, newPassword: string): Promise<void> {
        const passwordHistories =
            await this.passwordHistoryRepository.findActiveUser(userId);
        const matches = await Promise.all(
            passwordHistories.map(history =>
                this.helperHashService.argon2Compare(
                    newPassword,
                    history.password
                )
            )
        );
        if (matches.includes(true)) {
            throw new PasswordHistoryMustNewException(this.periodInDays);
        }
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        password: string,
        type: EnumPasswordHistoryType,
        expiredAt: Date,
        createdAt: Date,
        createdBy: string
    ): Promise<PasswordHistory> {
        return this.passwordHistoryRepository.createInTx(
            tx,
            userId,
            password,
            type,
            expiredAt,
            createdAt,
            createdBy
        );
    }

    async createManyInTx(
        tx: IDatabaseTransactionClient,
        entries: IPasswordHistoryCreate[]
    ): Promise<void> {
        if (entries.length === 0) {
            return;
        }

        await this.passwordHistoryRepository.createManyInTx(tx, entries);
    }

    async removeByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.passwordHistoryRepository.deleteManyByUserInTx(tx, userId);
    }

    /** Deletes the histories past their reuse period, the rows whose expiredAt is before now; returns the count. */
    async purgeExpired(): Promise<number> {
        const now = this.helperDateService.create();

        return this.passwordHistoryRepository.deleteExpiredBefore(now);
    }
}
