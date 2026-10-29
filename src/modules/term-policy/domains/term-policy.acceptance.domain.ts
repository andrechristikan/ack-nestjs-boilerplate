import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationRecipientDomain } from '@modules/notification/domains/notification.recipient.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { TermPolicyDefaultRequiredTypes } from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyAlreadyAcceptedException } from '@modules/term-policy/exceptions/term-policy.already-accepted.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyRequiredNotPublishedException } from '@modules/term-policy/exceptions/term-policy.required-not-published.exception';
import { TermPolicyRequiredInvalidException } from '@modules/term-policy/exceptions/term-policy.required-invalid.exception';
import type {
    ITermPolicyRef,
    ITermPolicyUserAcceptance,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { EnumTermPolicyType, Prisma } from '@generated/prisma-client/client';

@Injectable()
export class TermPolicyAcceptanceDomain {
    constructor(
        private readonly termPolicyRepository: TermPolicyRepository,
        private readonly notificationQueue: NotificationQueue,
        private readonly notificationRecipientDomain: NotificationRecipientDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async getPendingForUser(
        userId: string,
        required: EnumTermPolicyType[]
    ): Promise<ITermPolicyRef[]> {
        const types =
            required.length === 0 ? TermPolicyDefaultRequiredTypes : required;
        const latest =
            await this.termPolicyRepository.findLatestPublishedByTypes(types);
        if (latest.length === 0) {
            return [];
        }

        const accepted =
            await this.termPolicyRepository.findAcceptedTermPolicyIdsByUser(
                userId,
                latest.map(ref => ref.id)
            );

        return latest.filter(ref => !accepted.includes(ref.id));
    }

    async validateTermPolicyGuard(
        userId: string,
        required: EnumTermPolicyType[]
    ): Promise<void> {
        const pending = await this.getPendingForUser(userId, required);
        if (pending.length > 0) {
            throw new TermPolicyRequiredInvalidException();
        }
    }

    async assertRequiredPublishedInTx(
        tx: IDatabaseTransactionClient,
        required: EnumTermPolicyType[]
    ): Promise<ITermPolicyRef[]> {
        const refs =
            await this.termPolicyRepository.findLatestPublishedByTypesInTx(
                tx,
                required
            );
        const allPublished = required.every(type =>
            refs.some(ref => ref.type === type)
        );
        if (!allPublished) {
            throw new TermPolicyRequiredNotPublishedException();
        }

        return refs;
    }

    async getListUserAccepted(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.TermPolicyUserAcceptanceWhereInput>
    ): Promise<IResponsePaginationReturn<ITermPolicyUserAcceptance>> {
        return this.termPolicyRepository.findUserAccepted(userId, pagination);
    }

    async acceptPublishedInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        types: EnumTermPolicyType[],
        createdBy: string
    ): Promise<void> {
        const acceptedAt = this.helperDateService.create();
        const refs =
            await this.termPolicyRepository.findLatestPublishedByTypesInTx(
                tx,
                types
            );

        for (const ref of refs) {
            await this.termPolicyRepository.acceptInTx(
                tx,
                userId,
                ref.id,
                createdBy,
                acceptedAt
            );
        }
    }

    async userAccept(user: IUser, type: EnumTermPolicyType): Promise<void> {
        try {
            const activityLogs = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userAcceptTermPolicy,
                }),
            ];
            // Sequential by design: write must not run if an earlier step throws
            const recipient =
                await this.notificationRecipientDomain.getRecipient(
                    user,
                    EnumNotificationKind.userAcceptTermPolicy
                );
            const accepted = await this.databaseService.withTransaction(
                async tx => {
                    const [latest] =
                        await this.termPolicyRepository.findLatestPublishedByTypesInTx(
                            tx,
                            [type]
                        );
                    if (!latest) {
                        throw new TermPolicyNotFoundException();
                    }

                    const acceptedAt = this.helperDateService.create();
                    await this.termPolicyRepository.acceptInTx(
                        tx,
                        user.id,
                        latest.id,
                        user.id,
                        acceptedAt
                    );

                    return latest;
                }
            );

            this.activityLogDomain.stagePrepared(activityLogs);

            await this.notificationQueue.sendUserAcceptTermPolicy(recipient, {
                termPolicyId: accepted.id,
                type: accepted.type,
                version: accepted.version,
            });

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const isDuplicate = this.databaseUtil.isUniqueCollision(
                err,
                'termPolicyId'
            );
            const mapped = this.databaseUtil.toException(err);
            if (
                isDuplicate ||
                mapped instanceof DatabaseWriteConflictException
            ) {
                throw new TermPolicyAlreadyAcceptedException();
            }

            throw new AppUnknownException(err);
        }
    }
}
