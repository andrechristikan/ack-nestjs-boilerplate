import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { TenantLoginRequestDto } from '@modules/tenant/dtos/request/tenant.login.request.dto';
import { TenantLoginResponseDto } from '@modules/tenant/dtos/response/tenant.login.response.dto';
import { EnumTenantStatusCodeError } from '@modules/tenant/enums/tenant.status-code.enum';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { TenantUtil } from '@modules/tenant/utils/tenant.util';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserService } from '@modules/user/services/user.service';
import { ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class TenantAuthService {
    constructor(
        private readonly userService: UserService,
        private readonly userRepository: UserRepository,
        private readonly tenantRepository: TenantRepository,
        private readonly tenantUtil: TenantUtil
    ) {}

    async loginCredential(
        dto: TenantLoginRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<TenantLoginResponseDto>> {
        // 1. Validate credentials and resolve the user in parallel.
        //    loginCredential throws on bad credentials, so membership check
        //    is only reached when authentication fully succeeds.
        //    Note: for non-2FA users loginCredential already creates a session;
        //    if the membership gate below throws, that session will be orphaned.
        const [loginResult, user] = await Promise.all([
            this.userService.loginCredential(
                { email: dto.email, password: dto.password, from: dto.from },
                requestLog
            ),
            this.userRepository.findOneActiveByEmail(dto.email),
        ]);

        // 2. Gate: user must have at least one active tenant membership
        const memberships =
            await this.tenantRepository.findAllMembershipsByUser(user.id);

        if (memberships.length === 0) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.loginNoMembership,
                message: 'tenant.error.loginNoMembership',
            });
        }

        return {
            data: {
                ...loginResult.data,
                tenants: memberships.map(m => this.tenantUtil.mapMembership(m)),
            },
        };
    }
}
