import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { UserTwoFactorResponseDto } from '@modules/user/dtos/response/user.two-factor.response.dto';
import { EnumTenantMemberStatus } from '@prisma/client';

export class TenantMembershipDto {
    tenantId: string;
    tenantName: string;
    role: string;
    status: EnumTenantMemberStatus;
}

export class TenantLoginResponseDto {
    isTwoFactorEnable: boolean;
    tokens?: AuthTokenResponseDto;
    twoFactor?: UserTwoFactorResponseDto;
    tenants?: TenantMembershipDto[];
}
