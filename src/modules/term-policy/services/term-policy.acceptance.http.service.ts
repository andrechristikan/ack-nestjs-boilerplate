import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { TermPolicyUserAcceptanceResponseDto } from '@modules/term-policy/dtos/response/term-policy.user-acceptance.response.dto';
import { ITermPolicyAcceptanceHttpService } from '@modules/term-policy/interfaces/term-policy.acceptance.http.service.interface';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client';

@Injectable()
export class TermPolicyAcceptanceHttpService implements ITermPolicyAcceptanceHttpService {
    constructor(
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService,
        private readonly termPolicyUtil: TermPolicyUtil
    ) {}

    async getListUserAccepted(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.TermPolicyUserAcceptanceWhereInput>
    ): Promise<IResponsePagingReturn<TermPolicyUserAcceptanceResponseDto>> {
        const { data, ...others } =
            await this.termPolicyAcceptanceService.getListUserAccepted(
                userId,
                pagination
            );
        const termPolicies: TermPolicyUserAcceptanceResponseDto[] =
            this.termPolicyUtil.mapListUserAccepted(data);

        return {
            data: termPolicies,
            ...others,
        };
    }

    async userAccept(
        user: IUser,
        { type }: TermPolicyAcceptRequestDto
    ): Promise<IResponseReturn<void>> {
        await this.termPolicyAcceptanceService.userAccept(user, type);

        return {};
    }
}
