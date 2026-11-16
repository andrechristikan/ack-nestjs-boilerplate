import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import {
    TermPolicyRecipientSendSelect,
    TermPolicyRecipientSendWhere,
    TermPolicyRecipientStateSelect,
} from '@modules/term-policy/constants/term-policy.constant';
import type {
    ITermPolicyRecipientCreate,
    ITermPolicyRecipientState,
} from '@modules/term-policy/interfaces/term-policy.interface';
import type { ITermPolicyRecipientRepository } from '@modules/term-policy/interfaces/term-policy.recipient-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TermPolicyRecipientRepository implements ITermPolicyRecipientRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async findManyByUserIds(
        termPolicyId: string,
        userIds: string[]
    ): Promise<ITermPolicyRecipientState[]> {
        return this.databaseService.client.termPolicyRecipient.findMany({
            where: { termPolicyId, userId: { in: userIds } },
            select: TermPolicyRecipientStateSelect,
        });
    }

    async findManySendableByBatchIds(
        termPolicyId: string,
        batchIds: string[]
    ): Promise<ITermPolicyRecipientState[]> {
        return this.databaseService.client.termPolicyRecipient.findMany({
            where: {
                ...TermPolicyRecipientSendWhere,
                termPolicyId,
                batchId: { in: batchIds },
            },
            select: TermPolicyRecipientStateSelect,
            orderBy: { userId: EnumPaginationOrderDirectionType.asc },
        });
    }

    async createManyInTx(
        tx: IDatabaseTransactionClient,
        proceedBy: string,
        termPolicyId: string,
        batchId: string,
        recipients: ITermPolicyRecipientCreate[]
    ): Promise<void> {
        await tx.termPolicyRecipient.createMany({
            data: recipients.map(({ userId, notificationId }) => ({
                termPolicyId,
                userId,
                notificationId,
                batchId,
                sentAt: null,
                claimedAt: null,
                claimNonce: null,
                createdBy: proceedBy,
                updatedBy: proceedBy,
            })),
        });
    }

    async claim(
        termPolicyId: string,
        batchId: string,
        userIds: string[],
        claimNonce: string,
        claimedAt: Date,
        updatedBy: string
    ): Promise<string[]> {
        await this.databaseService.client.termPolicyRecipient.updateMany({
            where: {
                ...TermPolicyRecipientSendWhere,
                termPolicyId,
                batchId,
                userId: { in: userIds },
            },
            data: { claimedAt, claimNonce, updatedBy },
        });

        const rows =
            await this.databaseService.client.termPolicyRecipient.findMany({
                where: { termPolicyId, batchId, claimNonce },
                select: TermPolicyRecipientSendSelect,
            });

        return rows.map(({ userId }) => userId);
    }

    async markSentInTx(
        tx: IDatabaseTransactionClient,
        claimNonce: string,
        userIds: string[],
        sentAt: Date,
        updatedBy: string
    ): Promise<void> {
        await tx.termPolicyRecipient.updateMany({
            where: { claimNonce, userId: { in: userIds }, sentAt: null },
            data: { sentAt, updatedBy },
        });
    }

    async release(
        claimNonce: string,
        userIds: string[],
        updatedBy: string
    ): Promise<void> {
        await this.databaseService.client.termPolicyRecipient.updateMany({
            where: { claimNonce, userId: { in: userIds }, sentAt: null },
            data: { claimedAt: null, claimNonce: null, updatedBy },
        });
    }
}
