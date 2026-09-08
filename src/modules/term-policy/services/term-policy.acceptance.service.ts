import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { TermPolicyAlreadyAcceptedException } from '@modules/term-policy/exceptions/term-policy.already-accepted.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyRequiredInvalidException } from '@modules/term-policy/exceptions/term-policy.required-invalid.exception';
import { ITermPolicyAcceptanceService } from '@modules/term-policy/interfaces/term-policy.acceptance.service.interface';
import { ITermPolicyUserAcceptance } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { EnumTermPolicyType, Prisma } from '@generated/prisma-client';

@Injectable()
export class TermPolicyAcceptanceService implements ITermPolicyAcceptanceService {
    constructor(
        private readonly termPolicyRepository: TermPolicyRepository,
        private readonly notificationQueue: NotificationQueue,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async validateTermPolicyGuard(
        user: IUser | null,
        requiredTermPolicies: EnumTermPolicyType[]
    ): Promise<void> {
        if (!user) {
            throw new AuthJwtAccessTokenInvalidException();
        }

        const { termPolicy } = user;

        const defaultTermPolicies = [
            EnumTermPolicyType.termsOfService,
            EnumTermPolicyType.privacy,
        ];
        requiredTermPolicies =
            requiredTermPolicies.length === 0
                ? defaultTermPolicies
                : requiredTermPolicies;

        if (!requiredTermPolicies.every(type => termPolicy[type])) {
            throw new TermPolicyRequiredInvalidException();
        }
    }

    async getListUserAccepted(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.TermPolicyUserAcceptanceWhereInput>
    ): Promise<IResponsePagingReturn<ITermPolicyUserAcceptance>> {
        return this.termPolicyRepository.findUserAccepted(userId, pagination);
    }

    async userAccept(user: IUser, type: EnumTermPolicyType): Promise<void> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const policy =
            await this.termPolicyRepository.existLatestPublishedByType(type);
        if (!policy) {
            throw new TermPolicyNotFoundException();
        }

        const exist =
            await this.termPolicyRepository.existAcceptanceByPolicyAndUser(
                user.id,
                policy.id
            );
        if (exist) {
            throw new TermPolicyAlreadyAcceptedException();
        }

        try {
            await this.termPolicyRepository.accept(
                user,
                policy.id,
                type,
                requestLog
            );

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
