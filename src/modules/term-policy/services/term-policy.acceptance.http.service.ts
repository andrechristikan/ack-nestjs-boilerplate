import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { TermPolicyAcceptanceDefaultAvailableOrderBy } from '@modules/term-policy/constants/term-policy.list.constant';
import type { TermPolicyAcceptedListRequestDto } from '@modules/term-policy/dtos/request/term-policy.accepted-list.request.dto';
import type { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import type { ITermPolicyUserAcceptance } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TermPolicyAcceptanceHttpService {
    constructor(
        private readonly termPolicyAcceptanceDomain: TermPolicyAcceptanceDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async getListUserAccepted(
        userId: string,
        query: TermPolicyAcceptedListRequestDto
    ): Promise<IResponsePaginationReturn<ITermPolicyUserAcceptance>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.TermPolicyUserAcceptanceWhereInput>(
                query,
                {
                    availableOrderBy:
                        TermPolicyAcceptanceDefaultAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.termPolicyAcceptanceDomain.getListUserAccepted(
                userId,
                params
            );
        return {
            data,
            ...others,
        };
    }

    async userAccept(
        user: IUser,
        { type }: TermPolicyAcceptRequestDto
    ): Promise<IResponseReturn<void>> {
        await this.termPolicyAcceptanceDomain.userAccept(user, type);

        return {};
    }
}
