import { InviteCreateResponseDto } from '@modules/invite/dtos/response/invite-create.response.dto';
import { InviteSendResponseDto } from '@modules/invite/dtos/response/invite-send.response.dto';
import { InviteListResponseDto } from '@modules/invite/dtos/response/invite-list.response.dto';
import { InvitePublicResponseDto } from '@modules/invite/dtos/response/invite-public.response.dto';
import {
    InviteCreate,
    InviteFinalizeSignupInput,
    InviteWithUser,
} from '@modules/invite/interfaces/invite.interface';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    IPaginationCursorReturn,
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';

export interface IInviteService {
    createInvite(
        {
            inviteType,
            roleScope,
            contextId,
            contextName,
            memberId,
            userId,
        }: InviteCreate,
        requestedBy: string
    ): Promise<InviteCreateResponseDto>;

    sendInvite(
        inviteId: string,
        requestLog: IRequestLog,
        requestedBy: string
    ): Promise<InviteSendResponseDto>;

    deleteInvite(inviteId: string, deletedBy: string): Promise<void>;

    getListOffset(
        pagination: IPaginationQueryOffsetParams,
        inviteType?: Record<string, IPaginationEqual>,
        contextId?: Record<string, IPaginationEqual>,
        userId?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<InviteListResponseDto>>;

    getListCursor(
        pagination: IPaginationQueryCursorParams,
        inviteType?: Record<string, IPaginationEqual>,
        contextId?: Record<string, IPaginationEqual>,
        userId?: Record<string, IPaginationEqual>
    ): Promise<IPaginationCursorReturn<InviteListResponseDto>>;

    getInvite(
        token: string,
        inviteType: string
    ): Promise<InvitePublicResponseDto>;

    getOneActiveByToken(
        token: string,
        inviteType: string
    ): Promise<InviteWithUser>;

    getOneActiveByUserAndContext(
        userId: string,
        inviteType: string,
        contextId: string
    ): Promise<{ id: string }>;

    acceptInvite(
        inviteId: string,
        userId: string,
        requestLog: IRequestLog
    ): Promise<void>;

    signupByInvite(
        input: InviteFinalizeSignupInput,
        requestLog: IRequestLog
    ): Promise<void>;
}
