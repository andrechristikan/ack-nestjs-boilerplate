import { InviteCreateResponseDto } from '@modules/invite/dtos/response/invite-create.response.dto';
import { InviteSendResponseDto } from '@modules/invite/dtos/response/invite-send.response.dto';
import { InviteListResponseDto } from '@modules/invite/dtos/response/invite-list.response.dto';
import { InvitePublicResponseDto } from '@modules/invite/dtos/response/invite-public.response.dto';
import {
    InviteDeleteInput,
    InviteDispatchInput,
    InviteFinalizeAcceptInput,
    InviteFinalizeSignupInput,
    InviteGetActiveInput,
    InviteGetInput,
    InviteIssueInput,
    InviteListInput,
    InviteWithUser,
} from '@modules/invite/interfaces/invite.interface';

export interface IInviteService {
    issueInvite(input: InviteIssueInput): Promise<InviteCreateResponseDto>;

    dispatchInvite(input: InviteDispatchInput): Promise<InviteSendResponseDto>;

    deleteInvite(input: InviteDeleteInput): Promise<void>;

    listInvites(input?: InviteListInput): Promise<InviteListResponseDto[]>;

    getInvite(input: InviteGetInput): Promise<InvitePublicResponseDto>;

    getActiveInviteForProcessing(input: InviteGetActiveInput): Promise<InviteWithUser>;

    finalizeInviteAccept(input: InviteFinalizeAcceptInput): Promise<void>;

    finalizeInviteSignup(input: InviteFinalizeSignupInput): Promise<void>;
}
