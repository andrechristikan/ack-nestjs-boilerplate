import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PasswordHistoryAdminListDoc } from '@modules/password-history/docs/password-history.admin.doc';
import { PasswordHistoryResponseDto } from '@modules/password-history/dtos/response/password-history.response.dto';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { PolicyAbilityProtected } from '@modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@modules/policy/enums/policy.enum';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EnumRoleType } from '@prisma/client';

@ApiTags('modules.admin.user.passwordHistory')
@Controller({
    version: '1',
    path: '/user/:userId/password-history',
})
export class PasswordHistoryAdminController {
    constructor(
        private readonly passwordHistoryService: PasswordHistoryService
    ) {}

    @PasswordHistoryAdminListDoc()
    @ResponsePaging('passwordHistory.list')
    @PolicyAbilityProtected(
        {
            subject: ENUM_POLICY_SUBJECT.USER,
            action: [ENUM_POLICY_ACTION.READ],
        },
        {
            subject: ENUM_POLICY_SUBJECT.PASSWORD_HISTORY,
            action: [ENUM_POLICY_ACTION.READ],
        }
    )
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationOffsetQuery()
        pagination: IPaginationQueryOffsetParams,
        @Param('userId', RequestRequiredPipe) userId: string
    ): Promise<IResponsePagingReturn<PasswordHistoryResponseDto>> {
        return this.passwordHistoryService.getListOffsetByUser(
            userId,
            pagination
        );
    }
}
