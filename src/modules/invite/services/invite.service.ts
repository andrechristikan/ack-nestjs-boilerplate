import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { HelperService } from '@common/helper/services/helper.service';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { InviteCreateResponseDto } from '@modules/invite/dtos/response/invite-create.response.dto';
import { InviteListResponseDto } from '@modules/invite/dtos/response/invite-list.response.dto';
import { InvitePublicResponseDto } from '@modules/invite/dtos/response/invite-public.response.dto';
import { InviteRepository } from '@modules/invite/repositories/invite.repository';
import {
    InviteCreate,
    InviteFinalizeSignupInput,
    InviteWithUser,
} from '@modules/invite/interfaces/invite.interface';
import {
    IPaginationCursorReturn,
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IInviteService } from '@modules/invite/interfaces/invite.service.interface';
import { InviteConfigRegistry } from '@modules/invite/services/invite-config.registry';
import { InviteUtil } from '@modules/invite/utils/invite.util';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserRepository } from '@modules/user/repositories/user.repository';
import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    HttpStatus,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { EnumUserStatus, Prisma } from '@generated/prisma-client';
import { Duration } from 'luxon';
import { InviteSendResponseDto } from '@modules/invite/dtos/response/invite-send.response.dto';
import { TenantInviteType } from '@modules/tenant/constants/tenant.constant';

@Injectable()
export class InviteService implements IInviteService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly inviteRepository: InviteRepository,
        private readonly inviteConfigRegistry: InviteConfigRegistry,
        private readonly helperService: HelperService,
        private readonly authUtil: AuthUtil,
        private readonly notificationUtil: NotificationUtil,
        private readonly inviteUtil: InviteUtil
    ) {}

    /**
     * Creates an invitation for a user to join a context (project, tenant, etc.) with a specific role.
     * Generates an invite token and reuses existing active invite if one already exists for this user/context.
     * Does not send the email—use resendInvite() for that.
     */
    async createInvite(
        {
            inviteType,
            roleScope,
            contextId,
            contextName,
            memberId,
            userId,
        }: InviteCreate,
        requestedBy: string
    ): Promise<InviteCreateResponseDto> {
        const config = this.inviteConfigRegistry.getOrThrow(inviteType);
        const user = await this.userRepository.findOneById(userId);
        if (!user) {
            throw new NotFoundException({
                statusCode: EnumUserStatusCodeError.notFound,
                message: 'user.error.notFound',
            });
        } else if (user.status !== EnumUserStatus.active) {
            throw new ForbiddenException({
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
                message: 'user.error.inactive',
            });
        }

        try {
            let inviteRecord =
                await this.inviteRepository.findOneLatestActiveByUserAndContext(
                    user.id,
                    inviteType,
                    contextId
                );

            if (!inviteRecord) {
                const inviteToken = this.inviteUtil.createInviteToken(config);

                inviteRecord = await this.inviteRepository.createInvite(
                    user.email,
                    {
                        userId: user.id,
                        inviteType,
                        roleScope,
                        contextId,
                        contextName,
                        memberId,
                    },
                    inviteToken,
                    requestedBy
                );
            }

            return {
                memberId,
                inviteId: inviteRecord.id,
                userId: user.id,
                email: user.email,
                invite: this.inviteUtil.mapInviteStatus(inviteRecord),
            };
        } catch (err: unknown) {
            if (err instanceof HttpException) {
                throw err;
            }

            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    /**
     * Sends an invite email for an already-existing active invite.
     * Enforces a rate limit on resend—users cannot request a new email within the configured interval.
     * Updates the invite's sentAt timestamp and logs the action.
     */
    async sendInvite(
        inviteId: string,
        requestLog: IRequestLog,
        requestedBy: string
    ): Promise<InviteSendResponseDto> {
        const invite = await this.inviteRepository.findOneActiveById(inviteId);
        if (!invite) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                message: 'user.error.invitationTokenInvalid',
            });
        }

        const config = this.inviteConfigRegistry.getOrThrow(invite.inviteType);
        const today = this.helperService.dateCreate();
        const lastSentAt = invite.sentAt;
        if (lastSentAt) {
            const canResendAt = this.helperService.dateForward(
                lastSentAt,
                Duration.fromObject({
                    minutes: config.resendInMinutes,
                })
            );

            if (today < canResendAt) {
                throw new BadRequestException({
                    statusCode:
                        EnumUserStatusCodeError.verificationEmailResendLimitExceeded,
                    message: 'project.member.error.inviteResendLimitExceeded',
                    messageProperties: {
                        resendIn: this.helperService.dateDiff(
                            today,
                            canResendAt
                        ).minutes,
                    },
                });
            }
        }

        try {
            await this.notificationUtil.sendInvite(
                invite.user.id,
                {
                    link: this.inviteUtil.createInviteLink(
                        invite.token,
                        config
                    ),
                    expiredAt: invite.expiresAt,
                    expiredInMinutes: config.expiredInMinutes,
                    reference: invite.reference,
                    inviteType: invite.inviteType,
                    roleScope: invite.roleScope,
                    contextName: invite.contextName,
                },
                requestedBy
            );

            await this.inviteRepository.markInviteSent(
                invite.id,
                invite.user.id,
                requestedBy,
                requestLog
            );

            const resendAvailableAt = this.helperService.dateForward(
                today,
                Duration.fromObject({
                    minutes: config.resendInMinutes,
                })
            );

            return {
                invite: {
                    status: 'pending',
                    expiresAt: invite.expiresAt,
                    remainingSeconds: Math.max(
                        0,
                        Math.floor(
                            (invite.expiresAt.getTime() - today.getTime()) /
                                1000
                        )
                    ),
                    sentAt: today,
                },
                resendAvailableAt,
            };
        } catch (err: unknown) {
            if (err instanceof HttpException) {
                throw err;
            }

            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    /**
     * Soft-deletes an active invitation by its ID.
     * Guards are enforced in the repository (expiresAt > now, user.deletedAt: null).
     */
    async deleteInvite(inviteId: string, deletedBy: string): Promise<void> {
        await this.inviteRepository.softDelete(inviteId, deletedBy);
    }

    async getListOffset(
        pagination: IPaginationQueryOffsetParams<
            Prisma.InviteSelect,
            Prisma.InviteWhereInput
        >,
        inviteType?: Record<string, IPaginationEqual>,
        contextId?: Record<string, IPaginationEqual>,
        userId?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<InviteListResponseDto>> {
        const { data, ...others } =
            await this.inviteRepository.findWithPaginationOffset(
                pagination,
                inviteType,
                contextId,
                userId
            );
        return {
            data: this.inviteUtil.mapList(data),
            ...others,
        };
    }

    async getListCursor(
        pagination: IPaginationQueryCursorParams<
            Prisma.InviteSelect,
            Prisma.InviteWhereInput
        >,
        inviteType?: Record<string, IPaginationEqual>,
        contextId?: Record<string, IPaginationEqual>,
        userId?: Record<string, IPaginationEqual>
    ): Promise<IPaginationCursorReturn<InviteListResponseDto>> {
        const { data, ...others } =
            await this.inviteRepository.findWithPaginationCursor(
                pagination,
                inviteType,
                contextId,
                userId
            );
        return {
            data: this.inviteUtil.mapList(data),
            ...others,
        };
    }

    /**
     * Retrieves invitation details by token (public view).
     * Determines invite status: pending, expired, completed, or deleted.
     * Used by users to check their invite before accepting or signing up.
     */
    async getInvite(
        token: string,
        inviteType: string
    ): Promise<InvitePublicResponseDto> {
        const invite = await this.inviteRepository.findOneByToken(
            token,
            inviteType
        );
        if (!invite) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                message: 'user.error.invitationTokenInvalid',
            });
        }

        const today = this.helperService.dateCreate();
        let status: 'pending' | 'expired' | 'completed' | 'deleted' = 'pending';

        if (invite.deletedAt) {
            status = 'deleted';
        } else if (invite.acceptedAt) {
            status = 'completed';
        } else if (invite.expiresAt <= today) {
            status = 'expired';
        }

        return {
            //TODO: We need to partially-censor the user-email.
            email: invite.user.email,
            isVerified: invite.user.isVerified,
            status,
            expiresAt: invite.expiresAt,
            remainingSeconds:
                status === 'pending'
                    ? Math.max(
                          0,
                          Math.floor(
                              (invite.expiresAt.getTime() - today.getTime()) /
                                  1000
                          )
                      )
                    : undefined,
        };
    }

    async getOneActiveByToken(
        token: string,
        inviteType: string
    ): Promise<InviteWithUser> {
        const invite = await this.inviteRepository.findOneActiveByToken(
            token,
            inviteType
        );
        if (!invite) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                message: 'user.error.invitationTokenInvalid',
            });
        }

        return invite;
    }

    async getOneActiveByUserAndContext(
        userId: string,
        inviteType: string,
        contextId: string
    ): Promise<{ id: string }> {
        const invite =
            await this.inviteRepository.findOneLatestActiveByUserAndContext(
                userId,
                inviteType,
                contextId
            );
        if (!invite) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                message: 'user.error.invitationTokenInvalid',
            });
        }

        return invite;
    }

    /**
     * Finalizes an invite acceptance for an already-verified user.
     * Activates the membership and marks the invite as accepted.
     * If the user is not yet registered, they must use finalizeInviteSignup() instead.
     */
    async acceptInvite(
        inviteId: string,
        userId: string,
        requestLog: IRequestLog
    ): Promise<void> {
        const invite = await this.inviteRepository.findOneActiveById(inviteId);
        if (!invite) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                message: 'user.error.invitationTokenInvalid',
            });
        }

        if (!invite.user.isVerified) {
            // The user need to use the `invite/signup` endpoint to complete the signup process.
            throw new BadRequestException({
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'invite.error.useSignup',
            });
        }

        if (invite.userId !== userId) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'http.clientError.forbidden',
            });
        }

        try {
            await this.inviteRepository.acceptInvite(
                invite.id,
                invite.userId,
                requestLog,
                invite.inviteType === TenantInviteType
                    ? invite.contextId
                    : undefined
            );

            return;
        } catch (err: unknown) {
            if (err instanceof HttpException) {
                throw err;
            }

            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    /**
     * Completes user signup via an invite token.
     * Sets user name, password, and marks the user as verified.
     * Only works for new users — verified users must use finalizeInviteAccept().
     */
    async signupByInvite(
        {
            token,
            inviteType,
            firstName,
            lastName,
            password,
        }: InviteFinalizeSignupInput,
        requestLog: IRequestLog
    ): Promise<void> {
        const invite = await this.inviteRepository.findOneActiveByToken(
            token,
            inviteType
        );
        if (!invite) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                message: 'user.error.invitationTokenInvalid',
            });
        }

        if (invite.user.isVerified) {
            // The user associated to this invite-token is already signed up, and verified,
            //  needs to use the `/invite/accept` endpoint.
            throw new BadRequestException({
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'invite.error.useAccept',
            });
        }

        try {
            const name = `${firstName.trim()} ${lastName.trim()}`.trim();
            const passwordPayload = this.authUtil.createPassword(
                invite.userId,
                password
            );

            await this.inviteRepository.signupByInvite(
                invite.id,
                invite.userId,
                name,
                passwordPayload,
                requestLog,
                invite.inviteType === TenantInviteType
                    ? invite.contextId
                    : undefined
            );

            this.notificationUtil.sendVerifiedEmail(invite.user.id, {
                reference: invite.reference,
            });

            return;
        } catch (err: unknown) {
            if (err instanceof HttpException) {
                throw err;
            }

            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }
}
