import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { TermPolicyAlreadyAcceptedException } from '@modules/term-policy/exceptions/term-policy.already-accepted.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyRequiredInvalidException } from '@modules/term-policy/exceptions/term-policy.required-invalid.exception';
import { TermPolicyAcceptedColumnMap } from '@modules/term-policy/constants/term-policy.constant';
import type { ITermPolicyUserAcceptance } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserDomain } from '@modules/user/domains/user.domain';
import { Injectable } from '@nestjs/common';
import { EnumTermPolicyType, Prisma } from '@generated/prisma-client/client';

@Injectable()
export class TermPolicyAcceptanceDomain {
    constructor(
        private readonly termPolicyRepository: TermPolicyRepository,
        private readonly notificationQueue: NotificationQueue,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService,
        private readonly userDomain: UserDomain
    ) {}

    async validateTermPolicyGuard(
        user: IUser | null,
        requiredTermPolicies: EnumTermPolicyType[]
    ): Promise<void> {
        if (!user) {
            throw new AuthJwtAccessTokenInvalidException();
        }

        const defaultTermPolicies = [
            EnumTermPolicyType.termsOfService,
            EnumTermPolicyType.privacy,
        ];
        requiredTermPolicies =
            requiredTermPolicies.length === 0
                ? defaultTermPolicies
                : requiredTermPolicies;

        if (
            !requiredTermPolicies.every(
                type => user[TermPolicyAcceptedColumnMap[type]]
            )
        ) {
            throw new TermPolicyRequiredInvalidException();
        }
    }

    async getListUserAccepted(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.TermPolicyUserAcceptanceWhereInput>
    ): Promise<IResponsePagingReturn<ITermPolicyUserAcceptance>> {
        return this.termPolicyRepository.findUserAccepted(userId, pagination);
    }

    async acceptPublishedInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        types: EnumTermPolicyType[],
        createdBy: string
    ): Promise<void> {
        const acceptedAt = this.helperDateService.create();
        const termPolicies =
            await this.termPolicyRepository.findPublishedByTypesInTx(tx, types);

        for (const inputType of types) {
            const termPolicy = termPolicies.find(
                policy => policy.type === inputType
            );
            if (!termPolicy) {
                continue;
            }

            await this.termPolicyRepository.acceptInTx(
                tx,
                userId,
                termPolicy.id,
                createdBy,
                acceptedAt
            );
        }
    }

    async userAccept(user: IUser, type: EnumTermPolicyType): Promise<void> {
        const policy =
            await this.termPolicyRepository.findLatestPublishedByType(type);
        if (!policy) {
            throw new TermPolicyNotFoundException();
        }

        const exist =
            await this.termPolicyRepository.existsAcceptanceByPolicyAndUser(
                user.id,
                policy.id
            );
        if (exist) {
            throw new TermPolicyAlreadyAcceptedException();
        }

        try {
            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userAcceptTermPolicy,
                }),
            ];
            await this.databaseService.withTransaction(async tx => {
                const acceptedAt = this.helperDateService.create();
                await this.termPolicyRepository.acceptInTx(
                    tx,
                    user.id,
                    policy.id,
                    user.id,
                    acceptedAt
                );
                await this.userDomain.acceptTermPolicyInTx(tx, user.id, type);
            });

            this.activityLogDomain.stagePrepared(events);

            await this.notificationQueue.sendUserAcceptTermPolicy(user.id, {
                termPolicyId: policy.id,
                type: policy.type,
                version: policy.version,
            });

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
