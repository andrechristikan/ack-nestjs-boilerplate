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
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { PaginationCursorQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { TermPolicyUserAcceptanceResponseDto } from '@modules/term-policy/dtos/response/term-policy.user-acceptance.response.dto';
import {
    TermPolicySharedAcceptDoc,
    TermPolicySharedListAcceptedDoc,
} from '@modules/term-policy/docs/term-policy.shared.doc';
import { TermPolicyAcceptRequestDto } from '@modules/term-policy/dtos/request/term-policy.accept.request.dto';
import {
    RequestGeoLocation,
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { IUser } from '@modules/user/interfaces/user.interface';
import { GeoLocation, Prisma, UserAgent } from '@generated/prisma-client';

@ApiTags('modules.shared.user.termPolicy')
@Controller({
    version: '1',
    path: '/user/term-policy',
})
export class TermPolicySharedController {
    constructor(private readonly termPolicyService: TermPolicyService) {}

    @TermPolicySharedListAcceptedDoc()
    @ResponsePaging('termPolicy.listAccepted')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list/accepted')
    async listAccepted(
        @PaginationCursorQuery()
        pagination: IPaginationQueryCursorParams<
            Prisma.TermPolicyUserAcceptanceSelect,
            Prisma.TermPolicyUserAcceptanceWhereInput
        >,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponsePagingReturn<TermPolicyUserAcceptanceResponseDto>> {
        return this.termPolicyService.getListUserAccepted(userId, pagination);
    }

    @TermPolicySharedAcceptDoc()
    @Response('termPolicy.accept')
    @TermPolicyAcceptanceProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/accept')
    async accept(
        @UserCurrent() user: IUser,
        @Body() body: TermPolicyAcceptRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: UserAgent,
        @RequestGeoLocation() geoLocation: GeoLocation
    ): Promise<IResponseReturn<void>> {
        return this.termPolicyService.userAccept(user, body, {
            ipAddress,
            userAgent,
            geoLocation,
        });
    }
}
