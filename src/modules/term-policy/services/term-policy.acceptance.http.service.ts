import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { ITermPolicyAcceptanceHttpService } from '@modules/term-policy/interfaces/term-policy.acceptance.http.service.interface';
import { ITermPolicyUserAcceptance } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client';

@Injectable()
export class TermPolicyAcceptanceHttpService implements ITermPolicyAcceptanceHttpService {
    constructor(
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService
    ) {}

    async getListUserAccepted(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.TermPolicyUserAcceptanceWhereInput>
    ): Promise<IResponsePagingReturn<ITermPolicyUserAcceptance>> {
        const { data, ...others } =
            await this.termPolicyAcceptanceService.getListUserAccepted(
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
        await this.termPolicyAcceptanceService.userAccept(user, type);

        return {};
    }
}
