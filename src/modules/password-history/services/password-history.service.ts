import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumPasswordHistoryType } from '@generated/prisma-client/client';
import type { PasswordHistory } from '@generated/prisma-client/client';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import type {
    IPasswordHistoryCreate,
    IPasswordHistoryList,
} from '@modules/password-history/interfaces/password-history.interface';
import { PasswordHistoryMustNewException } from '@modules/password-history/exceptions/password-history.must-new.exception';
import { PasswordHistoryRepository } from '@modules/password-history/repositories/password-history.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PasswordHistoryService {
    constructor(
        private readonly passwordHistoryRepository: PasswordHistoryRepository,
        private readonly authPasswordUtil: AuthPasswordUtil
    ) {}

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
        const repeated = await this.authPasswordUtil.checkPasswordPeriod(
            passwordHistories,
            newPassword
        );
        if (repeated) {
            const passwordPeriodInDays =
                this.authPasswordUtil.getPasswordPeriodInDays();

            throw new PasswordHistoryMustNewException(passwordPeriodInDays);
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
}
