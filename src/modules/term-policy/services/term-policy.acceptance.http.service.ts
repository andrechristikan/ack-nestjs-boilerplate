import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import type { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import type { ITermPolicyUserAcceptance } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client/client';

@Injectable()
export class TermPolicyAcceptanceHttpService {
    constructor(
        private readonly termPolicyAcceptanceDomain: TermPolicyAcceptanceDomain
    ) {}

    async getListUserAccepted(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.TermPolicyUserAcceptanceWhereInput>
    ): Promise<IResponsePagingReturn<ITermPolicyUserAcceptance>> {
        const { data, ...others } =
            await this.termPolicyAcceptanceDomain.getListUserAccepted(
                userId,
                pagination
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
