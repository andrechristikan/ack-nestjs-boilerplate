import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { TenantLoginRequestDto } from '@modules/tenant/dtos/request/tenant.login.request.dto';
import {
    TenantLoginResponseDto,
    TenantMembershipDto,
} from '@modules/tenant/dtos/response/tenant.login.response.dto';
import { EnumTenantStatusCodeError } from '@modules/tenant/enums/tenant.status-code.enum';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { EnumUserStatus_CODE_ERROR } from '@modules/user/enums/user.status-code.enum';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserService } from '@modules/user/services/user.service';
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { EnumUserLoginWith, EnumUserStatus } from '@prisma/client';

@Injectable()
export class TenantAuthService {
    constructor(
        private readonly userService: UserService,
        private readonly userRepository: UserRepository,
        private readonly tenantRepository: TenantRepository,
        private readonly authUtil: AuthUtil
    ) {}

    async loginCredential(
        { email, password, from }: TenantLoginRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<TenantLoginResponseDto>> {
        // 1. Find and validate user
        const user = await this.userRepository.findOneWithRoleByEmail(email);

        if (!user) {
            throw new NotFoundException({
                statusCode: EnumUserStatus_CODE_ERROR.notFound,
                message: 'user.error.notFound',
            });
        }

        if (user.status !== EnumUserStatus.active) {
            throw new ForbiddenException({
                statusCode: EnumUserStatus_CODE_ERROR.inactiveForbidden,
                message: 'user.error.inactive',
            });
        }

        if (!user.password) {
            throw new BadRequestException({
                statusCode: EnumUserStatus_CODE_ERROR.passwordNotSet,
                message: 'auth.error.passwordNotSet',
            });
        }

        // 2. Check password attempts
        if (this.authUtil.checkPasswordAttempt(user)) {
            await this.userRepository.reachMaxPasswordAttempt(
                user.id,
                requestLog
            );

            throw new ForbiddenException({
                statusCode: EnumUserStatus_CODE_ERROR.passwordAttemptMax,
                message: 'auth.error.passwordAttemptMax',
            });
        }

        // 3. Validate password
        if (!this.authUtil.validatePassword(password, user.password)) {
            await this.userRepository.increasePasswordAttempt(user.id);

            throw new BadRequestException({
                statusCode: EnumUserStatus_CODE_ERROR.passwordNotMatch,
                message: 'auth.error.passwordNotMatch',
            });
        }

        await this.userRepository.resetPasswordAttempt(user.id);

        // 4. Check password expiry
        const checkPasswordExpired: boolean =
            this.authUtil.checkPasswordExpired(user.passwordExpired);
        if (checkPasswordExpired) {
            throw new ForbiddenException({
                statusCode: EnumUserStatus_CODE_ERROR.passwordExpired,
                message: 'auth.error.passwordExpired',
            });
        }

        // 5. Check email verification
        if (!user.isVerified) {
            throw new ForbiddenException({
                statusCode: EnumUserStatus_CODE_ERROR.emailNotVerified,
                message: 'user.error.emailNotVerified',
            });
        }

        // 6. CRITICAL: Validate tenant membership
        const memberships =
            await this.tenantRepository.findMembershipsWithPaginationCursorByUser(
                user.id,
                {
                    limit: 100,
                    orderBy: { createdAt: EnumPaginationOrderDirectionType.desc },
                    include: {},
                }
            );

        if (memberships.data.length === 0) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.loginNoMembership,
                message: 'tenant.error.loginNoMembership',
            });
        }

        // 7. Create tokens using existing user service
        const loginResult = await this.userService.loginCredential(
            { email, password, from },
            requestLog
        );

        // 8. Map tenant memberships
        const tenants: TenantMembershipDto[] = memberships.data.map(m => ({
            tenantId: m.tenantId,
            tenantName: m.tenant!.name,
            role: m.role!.name,
            status: m.status,
        }));

        // 9. Return enhanced response
        return {
            data: {
                ...loginResult.data,
                tenants,
            },
        };
    }
}
