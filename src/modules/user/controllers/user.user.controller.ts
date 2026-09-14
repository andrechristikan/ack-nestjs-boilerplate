import { RequestThrottle } from '@common/request/decorators/request.throttler.decorator';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';
import { Response } from '@common/response/decorators/response.decorator';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { UserUserDeleteSelfDoc } from '@modules/user/docs/user.user.doc';
import { UserHttpService } from '@modules/user/services/user.http.service';
import { Controller, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EnumRoleType } from '@generated/prisma-client';

@ApiTags('modules.user.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserUserController {
    constructor(private readonly userHttpService: UserHttpService) {}

    @UserUserDeleteSelfDoc()
    @Response('user.deleteSelf')
    @TermPolicyAcceptanceProtected()
    @RoleProtected(EnumRoleType.user)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.strict })
    @Delete('/self/delete')
    async deleteSelf(@AuthJwtPayload('userId') userId: string): Promise<void> {
        await this.userHttpService.deleteSelf(userId);
    }
}
