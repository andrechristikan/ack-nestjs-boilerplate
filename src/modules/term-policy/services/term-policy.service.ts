import { ENUM_APP_STATUS_CODE_ERROR } from '@app/enums/app.status-code.enum';
import {
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IRequestApp,
    IRequestLog,
} from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@modules/auth/enums/auth.status-code.enum';
import { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { TermPolicyResponseDto } from '@modules/term-policy/dtos/response/term-policy.response.dto';
import { TermPolicyUserAcceptanceResponseDto } from '@modules/term-policy/dtos/response/term-policy.user-acceptance.response.dto';
import { ENUM_TERM_POLICY_STATUS_CODE_ERROR } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { ITermPolicyService } from '@modules/term-policy/interfaces/term-policy.service.interface';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { UserTermPolicyDto } from '@modules/user/dtos/user.term-policy.dto';
import {
    ConflictException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { ENUM_TERM_POLICY_TYPE } from '@prisma/client';

@Injectable()
export class TermPolicyService implements ITermPolicyService {
    constructor(
        private readonly termPolicyRepository: TermPolicyRepository,
        private readonly termPolicyUtil: TermPolicyUtil
    ) {}

    async validateTermPolicyGuard(
        request: IRequestApp,
        requiredTermPolicies: ENUM_TERM_POLICY_TYPE[]
    ): Promise<void> {
        const { __user, user } = request;
        if (!__user || !user) {
            throw new ForbiddenException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const { termPolicy } = __user;

        try {
            const termPolicyObj = JSON.parse(
                (termPolicy as string) || '{}'
            ) as UserTermPolicyDto;
            if (!requiredTermPolicies.every(type => termPolicyObj[type])) {
                throw new ForbiddenException({
                    statusCode:
                        ENUM_TERM_POLICY_STATUS_CODE_ERROR.REQUIRED_INVALID,
                    message: 'termPolicy.error.requiredInvalid',
                });
            }
        } catch {
            throw new ForbiddenException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }
    }

    async getListPublished(
        pagination: IPaginationQueryCursorParams,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<TermPolicyResponseDto>> {
        const { data, ...others } =
            await this.termPolicyRepository.findPublished(pagination, type);

        const termPolicies: TermPolicyResponseDto[] =
            this.termPolicyUtil.mapList(data);

        return {
            data: termPolicies,
            ...others,
        };
    }

    async getListUserAccepted(
        userId: string,
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<TermPolicyUserAcceptanceResponseDto>> {
        const { data, ...others } =
            await this.termPolicyRepository.findUserAccepted(
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
        userId: string,
        { type }: TermPolicyAcceptRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const policy =
            await this.termPolicyRepository.existLatestPublishedByType(type);
        if (!policy) {
            throw new NotFoundException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'termPolicy.error.notFound',
            });
        }

        const exist =
            await this.termPolicyRepository.existAcceptanceByPolicyAndUser(
                userId,
                type
            );
        if (exist) {
            throw new ConflictException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.ALREADY_ACCEPTED,
                message: 'termPolicy.error.alreadyAccepted',
            });
        }

        try {
            await this.termPolicyRepository.accept(
                userId,
                policy.id,
                type,
                requestLog
            );

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }
}
