import type { TermPolicyAcceptedListRequestDto } from '@modules/term-policy/dtos/request/term-policy.accepted-list.request.dto';
import { TermPolicyAcceptedListRequestSchema } from '@modules/term-policy/dtos/request/term-policy.accepted-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { ApiTags } from '@nestjs/swagger';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Query,
} from '@nestjs/common';
import {
    UserCurrent,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@modules/auth/decorators/auth.jwt.decorator';
import {
    Response,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';
import { TermPolicyGetListUserAcceptedUseCase } from '@modules/term-policy/use-cases/term-policy.get-list-user-accepted.use-case';
import { TermPolicyGetListUserPendingUseCase } from '@modules/term-policy/use-cases/term-policy.get-list-user-pending.use-case';
import { TermPolicyUserAcceptUseCase } from '@modules/term-policy/use-cases/term-policy.user-accept.use-case';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { TermPolicyUserAcceptanceResponseSchema } from '@modules/term-policy/dtos/response/term-policy.user-acceptance.response.dto';
import { TermPolicyAcceptRequestSchema } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import type { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { TermPolicyPendingResponseSchema } from '@modules/term-policy/dtos/response/term-policy.pending.response.dto';
import type {
    ITermPolicyPending,
    ITermPolicyUserAcceptance,
} from '@modules/term-policy/interfaces/term-policy.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';

@ApiTags('modules.shared.user.termPolicy')
@Controller({
    version: '1',
    path: '/user/term-policy',
})
export class TermPolicySharedController {
    constructor(
        private readonly termPolicyGetListUserAcceptedUseCase: TermPolicyGetListUserAcceptedUseCase,
        private readonly termPolicyGetListUserPendingUseCase: TermPolicyGetListUserPendingUseCase,
        private readonly termPolicyUserAcceptUseCase: TermPolicyUserAcceptUseCase
    ) {}

    @Doc({ summary: 'list of terms or policies accepted by the user' })
    @ResponsePagination('termPolicy.listAccepted', {
        schema: TermPolicyUserAcceptanceResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/acceptance/list')
    async listAccepted(
        @Query({ schema: TermPolicyAcceptedListRequestSchema })
        query: TermPolicyAcceptedListRequestDto,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponsePaginationReturn<ITermPolicyUserAcceptance>> {
        return this.termPolicyGetListUserAcceptedUseCase.execute(userId, query);
    }

    @Doc({
        summary:
            'list of required terms or policies the user has not accepted yet',
    })
    @Response('termPolicy.listPending', {
        schema: TermPolicyPendingResponseSchema,
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/pending/list')
    async listPending(
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponseReturn<ITermPolicyPending>> {
        return this.termPolicyGetListUserPendingUseCase.execute(userId);
    }

    @Doc({ summary: 'user accepts term or policy' })
    @Response('termPolicy.accept')
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/accept')
    async accept(
        @UserCurrent() user: IUser,
        @Body({ schema: TermPolicyAcceptRequestSchema })
        body: TermPolicyAcceptRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.termPolicyUserAcceptUseCase.execute(user, body);
    }
}
