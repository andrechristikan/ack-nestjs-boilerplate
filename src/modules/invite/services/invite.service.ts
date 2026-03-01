import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { HelperService } from '@common/helper/services/helper.service';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { EmailService } from '@modules/email/services/email.service';
import { InviteCreateResponseDto } from '@modules/invite/dtos/response/invite-create.response.dto';
import { InviteListResponseDto } from '@modules/invite/dtos/response/invite-list.response.dto';
import { InvitePublicResponseDto } from '@modules/invite/dtos/response/invite-public.response.dto';
import { InviteSendResponseDto } from '@modules/invite/dtos/response/invite-send.response.dto';
import { InviteRepository } from '@modules/invite/repositories/invite.repository';
import {
    InviteConfig,
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
import { EnumUserStatus } from '@prisma/client';
import { Duration } from 'luxon';

@Injectable()
export class InviteService implements IInviteService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly inviteRepository: InviteRepository,
        private readonly inviteConfigRegistry: InviteConfigRegistry,
        private readonly helperService: HelperService,
        private readonly authUtil: AuthUtil,
        private readonly emailService: EmailService,
        private readonly inviteUtil: InviteUtil
    ) {}

    /**
     * Retrieves the invite configuration for a given invitation type.
     * Throws if the type is not registered in the config registry.
     */
    private getInviteConfigOrThrow(invitationType: string): InviteConfig {
        return this.inviteConfigRegistry.getOrThrow(invitationType);
    }

    /**
     * Creates an invitation for a user to join a context (project, tenant, etc.) with a specific role.
     * Generates an invite token and reuses existing active invite if one already exists for this user/context.
     * Does not send the email—use dispatchInvite() for that.
     */
    async createInvite(input: InviteIssueInput): Promise<InviteCreateResponseDto> {
        const {
            invitationType,
            roleScope,
            contextId,
            contextName,
            memberId,
            userId,
            requestedBy,
        } = input;

        try {
            const config = this.getInviteConfigOrThrow(invitationType);
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

            let inviteRecord =
                await this.inviteRepository.findOneLatestActiveByUserAndContext(
                    user.id,
                    invitationType,
                    contextId
                );

            if (!inviteRecord) {
                const inviteToken =
                    this.inviteUtil.createInviteTokenPayload(config);

                inviteRecord = await this.inviteRepository.createInvite({
                    userId: user.id,
                    userEmail: user.email,
                    token: inviteToken.token,
                    reference: inviteToken.reference,
                    expiresAt: inviteToken.expiresAt,
                    invitationType,
                    roleScope,
                    contextId,
                    contextName,
                    memberId,
                    requestedBy,
                });
            }

            return {
                memberId,
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
     * Creates an invitation (if needed) and sends an invite email to the user.
     * Enforces a rate limit on resend—users cannot request a new email within the configured interval.
     * Updates the invite's sentAt timestamp and logs the action.
     */
    async dispatchInvite(input: InviteDispatchInput): Promise<InviteSendResponseDto> {
        const {
            invitationType,
            roleScope,
            emailTypeLabel,
            contextId,
            contextName,
            memberId,
            userId,
            requestLog,
            requestedBy,
        } = input;

        try {
            const config = this.getInviteConfigOrThrow(invitationType);
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

            const today = this.helperService.dateCreate();
            let invite =
                await this.inviteRepository.findOneLatestActiveByUserAndContext(
                    user.id,
                    invitationType,
                    contextId
                );

            if (!invite) {
                const invitePayload =
                    this.inviteUtil.createInviteTokenPayload(config);

                invite = await this.inviteRepository.createInvite({
                    userId: user.id,
                    userEmail: user.email,
                    token: invitePayload.token,
                    reference: invitePayload.reference,
                    expiresAt: invitePayload.expiresAt,
                    invitationType,
                    roleScope,
                    contextId,
                    contextName,
                    memberId,
                    requestedBy,
                });
            }

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
                        message:
                            'project.member.error.inviteResendLimitExceeded',
                        messageProperties: {
                            resendIn: this.helperService.dateDiff(
                                today,
                                canResendAt
                            ).minutes,
                        },
                    });
                }
            }

            await this.emailService.sendInvite(
                user.id,
                {
                    email: user.email,
                    username: user.username,
                },
                {
                    expiredAt: invite.expiresAt.toISOString(),
                    reference: invite.reference,
                    link: this.inviteUtil.createInviteLink(invite.token, config),
                    expiredInMinutes: config.expiredInMinutes,
                    invitationType: emailTypeLabel,
                    roleScope,
                    contextName,
                }
            );

            await this.inviteRepository.markInviteSent(
                invite.id,
                user.id,
                requestedBy,
                requestLog
            );

            const resendAvailableAt = this.helperService.dateForward(
                today,
                Duration.fromObject({
                    minutes: config.resendInMinutes,
                })
            );

            const now = this.helperService.dateCreate();
            return {
                invite: {
                    status: 'pending',
                    expiresAt: invite.expiresAt,
                    remainingSeconds: Math.max(
                        0,
                        Math.floor(
                            (invite.expiresAt.getTime() - now.getTime()) /
                                1000
                        )
                    ),
                    sentAt: now,
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
     * Soft-deletes the most recent active invitation for a user.
     * Marks the invite as deleted without invalidating the token, so it can be distinguished
     * from accepted/expired invitations in status queries.
     */
    async deleteInvite({ userId, deletedBy }: InviteDeleteInput): Promise<void> {
        const invite =
            await this.inviteRepository.findOneLatestActiveByUserId(userId);
        if (!invite) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'invite.error.notFound',
            });
        }

        await this.inviteRepository.softDelete(invite.id, deletedBy);

        return;
    }

    /**
     * Lists invitations filtered by type and optional context.
     * Allows querying invites for display/management purposes.
     */
    async listInvites(options?: InviteListInput): Promise<InviteListResponseDto[]> {
        const invites = await this.inviteRepository.findMany(options);

        return this.inviteUtil.mapList(invites);
    }

    /**
     * Retrieves invitation details by token (public view).
     * Determines invite status: pending, expired, completed, or deleted.
     * Used by users to check their invite before accepting or signing up.
     */
    async getInvite({ token, invitationType }: InviteGetInput): Promise<InvitePublicResponseDto> {
        const invite = await this.inviteRepository.findOneByToken(token, invitationType);
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

    /**
     * Retrieves an active (non-expired, non-deleted, non-accepted) invitation by token.
     * Used internally to validate and fetch invite data before processing accept/signup operations.
     */
    async getActiveInviteForProcessing({
        token,
    }: InviteGetActiveInput): Promise<InviteWithUser> {
        const invite = await this.inviteRepository.findOneActiveByToken(token);
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
     * If the user is unverified, they must use finalizeInviteSignup() instead.
     */
    async finalizeInviteAccept({
        inviteId,
        userId,
        requestLog,
    }: InviteFinalizeAcceptInput): Promise<void> {
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
                requestLog
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
     * Only works for unverified users—verified users must use finalizeInviteAccept().
     */
    async finalizeInviteSignup({
        token,
        firstName,
        lastName,
        password,
        requestLog,
    }: InviteFinalizeSignupInput): Promise<void> {
        const invite = await this.inviteRepository.findOneActiveByToken(token);
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
            const passwordPayload = this.authUtil.createPassword(password);

            await this.inviteRepository.signupByInvite(
                invite.id,
                invite.userId,
                name,
                passwordPayload,
                requestLog
            );

            //TODO: We shall move this to Queue instead of sending email here.
            this.emailService.sendVerified(
                invite.user.id,
                {
                    email: invite.user.email,
                    username: invite.user.username,
                },
                {
                    reference: invite.reference,
                }
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
}
