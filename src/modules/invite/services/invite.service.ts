import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { HelperService } from '@common/helper/services/helper.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { EmailService } from '@modules/email/services/email.service';
import { InviteProvider } from '@modules/invite/interfaces/invite.interface';
import { InviteCreateRequestDto } from '@modules/invite/dtos/request/invite.create.request.dto';
import { InviteCreateResponseDto } from '@modules/invite/dtos/response/invite-create.response.dto';
import { InviteListResponseDto } from '@modules/invite/dtos/response/invite-list.response.dto';
import { InvitePublicResponseDto } from '@modules/invite/dtos/response/invite-public.response.dto';
import { InviteSendResponseDto } from '@modules/invite/dtos/response/invite-send.response.dto';
import { InviteAcceptRequestDto } from '@modules/invite/dtos/request/invite-accept.request.dto';
import { InviteSignupRequestDto } from '@modules/invite/dtos/request/invite-signup.request.dto';
import { InviteRepository } from '@modules/invite/repositories/invite.repository';
import { InviteProviderRegistry } from '@modules/invite/services/invite-provider.registry';
import { InviteUtil } from '@modules/invite/utils/invite.util';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { UserService } from '@modules/user/services/user.service';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserRepository } from '@modules/user/repositories/user.repository';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    HttpStatus,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { EnumInviteType, EnumUserStatus } from '@prisma/client';
import { Duration } from 'luxon';

@Injectable()
export class InviteService {
    constructor(
        private readonly roleRepository: RoleRepository,
        private readonly userService: UserService,
        private readonly userRepository: UserRepository,
        private readonly inviteRepository: InviteRepository,
        private readonly inviteProviderRegistry: InviteProviderRegistry,
        private readonly helperService: HelperService,
        private readonly authUtil: AuthUtil,
        private readonly emailService: EmailService,
        private readonly inviteUtil: InviteUtil
    ) {}

    private resolveProviderByInviteType(
        invitationType: EnumInviteType
    ): InviteProvider {
        return this.inviteProviderRegistry.getOrThrow(invitationType);
    }

    async createInvite(
        contextId: string,
        dto: InviteCreateRequestDto,
        provider: InviteProvider,
        requestLog: IRequestLog,
        createdBy: string
    ): Promise<IResponseReturn<InviteCreateResponseDto>> {
        try {
            const role = await this.roleRepository.existById(dto.roleId);
            if (!role || role.scope !== provider.roleScope) {
                throw new NotFoundException({
                    statusCode: EnumRoleStatusCodeError.notFound,
                    message: 'role.error.notFound',
                });
            }

            const normalizedEmail = dto.email.toLowerCase().trim();
            let user =
                await this.userRepository.findOneByEmail(normalizedEmail);
            if (!user) {
                user = await this.userService.createForInvitation(
                    normalizedEmail,
                    provider.signUpFrom,
                    requestLog,
                    createdBy
                );
            }

            const existingMember = await provider.findMemberByUserId(
                contextId,
                user.id
            );

            if (existingMember && existingMember.status !== 'pending') {
                throw new ConflictException({
                    statusCode: HttpStatus.CONFLICT,
                    message: 'invite.error.memberExist',
                });
            }

            const memberId =
                existingMember?.status === 'pending'
                    ? existingMember.id
                    : await provider.createMember(
                          contextId,
                          user.id,
                          role.id,
                          createdBy
                      );

            const contextName = await provider.getContextName(contextId);
            if (!contextName) {
                throw new NotFoundException({
                    statusCode: HttpStatus.NOT_FOUND,
                    message: 'invite.error.contextNotFound',
                });
            }

            let inviteRecord =
                await this.inviteRepository.findOneLatestActiveByUserAndContext(
                    user.id,
                    provider.invitationType,
                    contextId
                );

            if (!inviteRecord) {
                const inviteToken = this.inviteUtil.createInviteTokenPayload();

                inviteRecord = await this.inviteRepository.createInvite({
                    userId: user.id,
                    userEmail: user.email,
                    token: inviteToken.token,
                    reference: inviteToken.reference,
                    expiresAt: inviteToken.expiresAt,
                    invitationType: provider.invitationType,
                    roleScope: provider.roleScope,
                    contextId,
                    contextName,
                    memberId,
                    requestedBy: createdBy,
                });
            }

            return {
                data: {
                    memberId,
                    userId: user.id,
                    email: user.email,
                    invite: this.inviteUtil.mapInviteStatus(inviteRecord),
                },
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

    async sendInvite(
        contextId: string,
        memberId: string,
        provider: InviteProvider,
        requestLog: IRequestLog,
        requestedBy: string
    ): Promise<IResponseReturn<InviteSendResponseDto>> {
        const userId = await provider.findMemberUserId(contextId, memberId);

        if (!userId) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'invite.error.memberNotFound',
            });
        }

        const contextName = await provider.getContextName(contextId);
        if (!contextName) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'invite.error.contextNotFound',
            });
        }

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
            const today = this.helperService.dateCreate();
            let invite =
                await this.inviteRepository.findOneLatestActiveByUserAndContext(
                    user.id,
                    provider.invitationType,
                    contextId
                );

            if (!invite) {
                const invitePayload =
                    this.inviteUtil.createInviteTokenPayload();

                invite = await this.inviteRepository.createInvite({
                    userId: user.id,
                    userEmail: user.email,
                    token: invitePayload.token,
                    reference: invitePayload.reference,
                    expiresAt: invitePayload.expiresAt,
                    invitationType: provider.invitationType,
                    roleScope: provider.roleScope,
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
                        minutes: this.inviteUtil.inviteResendInMinutes,
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
                    link: this.inviteUtil.createInviteLink(invite.token),
                    expiredInMinutes: this.inviteUtil.inviteExpiredInMinutes,
                    invitationType:
                        provider.invitationType === EnumInviteType.tenantMember
                            ? 'tenant_member'
                            : 'project_member',
                    roleScope: provider.roleScope,
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
                    minutes: this.inviteUtil.inviteResendInMinutes,
                })
            );

            const now = this.helperService.dateCreate();
            return {
                data: {
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
                },
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
     * Soft-deletes a pending invitation by setting `deletedAt` / `deletedBy`
     * on the invitation record.
     *
     * The token itself is NOT marked as used so it remains distinguishable
     * from a completed invitation in `mapInviteStatus()`.
     */
    async deleteInvite(
        userId: string,
        deletedBy: string
    ): Promise<IResponseReturn<void>> {
        const invite =
            await this.inviteRepository.findOneLatestActiveByUserId(userId);
        if (!invite) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'invite.error.notFound',
            });
        }

        await this.inviteRepository.softDelete(invite.id, deletedBy);

        return {};
    }

    /**
     * Lists invitations filtered by invitation type and optional context.
     *
     * Queries `Invitation` records and filters by scalar invitation fields.
     */
    async listInvites(options?: {
        invitationType?: EnumInviteType;
        contextId?: string;
        userId?: string;
        includeDeleted?: boolean;
        pendingOnly?: boolean;
    }): Promise<IResponseReturn<InviteListResponseDto[]>> {
        const invites = await this.inviteRepository.findMany(options);

        return { data: this.inviteUtil.mapList(invites) };
    }

    async getInvite(
        token: string
    ): Promise<IResponseReturn<InvitePublicResponseDto>> {
        const invite = await this.inviteRepository.findOneByToken(token);
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
            data: {
                email: invite.user.email,
                isVerified: invite.user.isVerified,
                status,
                expiresAt: invite.expiresAt,
                remainingSeconds:
                    status === 'pending'
                        ? Math.max(
                              0,
                              Math.floor(
                                  (invite.expiresAt.getTime() -
                                      today.getTime()) /
                                      1000
                              )
                          )
                        : undefined,
            },
        };
    }

    async acceptInvite(
        { token }: InviteAcceptRequestDto,
        userId: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const invite = await this.inviteRepository.findOneActiveByToken(token);
        if (!invite) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                message: 'user.error.invitationTokenInvalid',
            });
        }

        if (invite.userId !== userId) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'http.clientError.forbidden',
            });
        }

        if (!invite.user.isVerified) {
            throw new BadRequestException({
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'invite.error.useComplete',
            });
        }

        try {
            const provider = this.resolveProviderByInviteType(
                invite.invitationType
            );

            // TODO: Use a shared transaction when coordinating invite + membership updates across repositories from different modules.
            await provider.activateMemberForInvite(
                invite.contextId,
                invite.userId,
                invite.memberId
            );

            await this.inviteRepository.acceptInvite(
                invite.id,
                invite.userId,
                requestLog
            );

            return {};
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

    async signupByInvite(
        { token, firstName, lastName, password }: InviteSignupRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const invite = await this.inviteRepository.findOneActiveByToken(token);
        if (!invite) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                message: 'user.error.invitationTokenInvalid',
            });
        }
        if (invite.user.isVerified) {
            throw new BadRequestException({
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'invite.error.useAccept',
            });
        }

        try {
            const name = `${firstName.trim()} ${lastName.trim()}`.trim();
            const passwordPayload = this.authUtil.createPassword(password);

            const provider = this.resolveProviderByInviteType(
                invite.invitationType
            );

            // TODO: Use a shared transaction when coordinating invite + membership updates across repositories from different modules.
            await provider.activateMemberForInvite(
                invite.contextId,
                invite.userId,
                invite.memberId
            );

            await this.inviteRepository.signupByInvite(
                invite.id,
                invite.userId,
                name,
                passwordPayload,
                requestLog
            );

            await this.emailService.sendVerified(
                invite.user.id,
                {
                    email: invite.user.email,
                    username: invite.user.username,
                },
                {
                    reference: invite.reference,
                }
            );

            return {};
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
