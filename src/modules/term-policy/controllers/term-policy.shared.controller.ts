import { ApiTags } from '@nestjs/swagger';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
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
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import { TermPolicyAcceptanceDefaultAvailableOrderBy } from '@modules/term-policy/constants/term-policy.list.constant';
import { TermPolicyAcceptanceHttpService } from '@modules/term-policy/services/term-policy.acceptance.http.service';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { RequestThrottle } from '@common/request/decorators/request.throttler.decorator';
import { PaginationCursorQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { TermPolicyUserAcceptanceResponseSchema } from '@modules/term-policy/dtos/response/term-policy.user-acceptance.response.dto';
import {
    TermPolicySharedAcceptDoc,
    TermPolicySharedListAcceptedDoc,
} from '@modules/term-policy/docs/term-policy.shared.doc';
import {
    TermPolicyAcceptRequestDto,
    TermPolicyAcceptRequestSchema,
} from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { ITermPolicyUserAcceptance } from '@modules/term-policy/interfaces/term-policy.interface';
import { IUser } from '@modules/user/interfaces/user.interface';
import { Prisma } from '@generated/prisma-client';

@ApiTags('modules.shared.user.termPolicy')
@Controller({
    version: '1',
    path: '/user/term-policy',
})
export class TermPolicySharedController {
    constructor(
        private readonly termPolicyAcceptanceHttpService: TermPolicyAcceptanceHttpService
    ) {}

    @TermPolicySharedListAcceptedDoc()
    @ResponsePaging('termPolicy.listAccepted', {
        schema: TermPolicyUserAcceptanceResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/acceptance/list')
    async listAccepted(
        @PaginationCursorQuery({
            availableOrderBy: TermPolicyAcceptanceDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryCursorParams<Prisma.TermPolicyUserAcceptanceWhereInput>,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponsePagingReturn<ITermPolicyUserAcceptance>> {
        return this.termPolicyAcceptanceHttpService.getListUserAccepted(
            userId,
            pagination
        );
    }

    @TermPolicySharedAcceptDoc()
    @Response('termPolicy.accept')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @HttpCode(HttpStatus.OK)
    @Post('/accept')
    async accept(
        @UserCurrent() user: IUser,
        @Body({ schema: TermPolicyAcceptRequestSchema })
        body: TermPolicyAcceptRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.termPolicyAcceptanceHttpService.userAccept(user, body);
    }
}
