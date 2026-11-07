import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { TermPolicyAcceptedListRequestDto } from '@modules/term-policy/dtos/request/term-policy.accepted-list.request.dto';
import type { ITermPolicyUserAcceptance } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import {
    TermPolicyAcceptanceDefaultAvailableOrderBy,
    TermPolicyAcceptanceSharedListCursorScope,
} from '@modules/term-policy/constants/term-policy.list.constant';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class TermPolicyGetListUserAcceptedUseCase implements IAppUseCase<
    [string, TermPolicyAcceptedListRequestDto],
    IResponsePaginationReturn<ITermPolicyUserAcceptance>
> {
    constructor(
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        userId: string,
        query: TermPolicyAcceptedListRequestDto
    ): Promise<IResponsePaginationReturn<ITermPolicyUserAcceptance>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.TermPolicyUserAcceptanceWhereInput>(
                query,
                {
                    scope: TermPolicyAcceptanceSharedListCursorScope,
                    availableOrderBy:
                        TermPolicyAcceptanceDefaultAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.termPolicyAcceptanceService.getListUserAccepted(
                userId,
                params
            );
        return {
            data,
            ...others,
        };
    }
}
