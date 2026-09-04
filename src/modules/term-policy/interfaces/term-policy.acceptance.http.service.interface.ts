import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { TermPolicyUserAcceptanceResponseDto } from '@modules/term-policy/dtos/response/term-policy.user-acceptance.response.dto';
import { IUser } from '@modules/user/interfaces/user.interface';
import { Prisma } from '@generated/prisma-client';

export interface ITermPolicyAcceptanceHttpService {
    getListUserAccepted(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.TermPolicyUserAcceptanceWhereInput>
    ): Promise<IResponsePagingReturn<TermPolicyUserAcceptanceResponseDto>>;
    userAccept(
        user: IUser,
        body: TermPolicyAcceptRequestDto
    ): Promise<IResponseReturn<void>>;
}
