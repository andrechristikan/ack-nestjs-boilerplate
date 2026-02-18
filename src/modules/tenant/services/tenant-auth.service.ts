import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { TenantLoginRequestDto } from '@modules/tenant/dtos/request/tenant.login.request.dto';
import {
    TenantLoginResponseDto,
    TenantMembershipDto,
} from '@modules/tenant/dtos/response/tenant.login.response.dto';
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
        // 1. Lightweight lookup — null means user not found or not active
        const user = await this.userRepository.findOneActiveByEmail(dto.email);

        let tenants: TenantMembershipDto[] = [];

        if (user !== null) {
            // 2. Gate: user must have at least one active tenant membership
            const memberships =
                await this.tenantRepository.findAllMembershipsByUser(user.id);

            if (memberships.length === 0) {
                throw new ForbiddenException({
                    statusCode: EnumTenantStatusCodeError.loginNoMembership,
                    message: 'tenant.error.loginNoMembership',
                });
            }

            tenants = memberships.map(m => this.tenantUtil.mapMembership(m));
        }

        // 3. Delegate all credential validation and token creation to UserService.
        //    When user is null, UserService will throw the correct error (notFound / inactive).
        const loginResult = await this.userService.loginCredential(
            { email: dto.email, password: dto.password, from: dto.from },
            requestLog
        );

        return {
            data: {
                ...loginResult.data,
                tenants,
            },
        };
    }
}
