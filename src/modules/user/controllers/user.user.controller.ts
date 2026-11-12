import { Doc } from '@common/doc/decorators/doc.decorator';
import {
    RequestContextCurrent,
    RequestThrottle,
} from '@common/request/decorators/request.decorator';
import {
    EnumRequestContextScope,
    EnumRequestThrottleRoute,
} from '@common/request/enums/request.enum';
import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import { Response } from '@common/response/decorators/response.decorator';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { UserDeleteSelfRequestSchema } from '@modules/user/dtos/request/user.delete-self.request.dto';
import type { UserDeleteSelfRequestDto } from '@modules/user/dtos/request/user.delete-self.request.dto';
import { UserDeleteSelfUseCase } from '@modules/user/use-cases/user.delete-self.use-case';
import { Body, Controller, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EnumRoleType } from '@generated/prisma-client/client';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';

@ApiTags('modules.user.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserUserController {
    constructor(
        private readonly userDeleteSelfUseCase: UserDeleteSelfUseCase
    ) {}

    @Doc({ summary: 'user delete their account' })
    @Response('user.deleteSelf')
    @TermPolicyAcceptanceProtected()
    @RoleProtected(EnumRoleType.user)
    @UserProtected()
    @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.strict })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/self/delete')
    async deleteSelf(
        @RequestContextCurrent(EnumRequestContextScope.user)
        context: IRequestContextUser,
        @Body({ schema: UserDeleteSelfRequestSchema })
        body: UserDeleteSelfRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.userDeleteSelfUseCase.execute(context, body);
    }
}
