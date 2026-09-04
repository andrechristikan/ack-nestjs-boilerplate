import { RequestIsValidObjectIdPipe } from '@common/request/pipes/request.is-valid-object-id.pipe';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeySystemProtected } from '@modules/api-key/decorators/api-key.decorator';
import { RoleSystemGetAbilitiesDoc } from '@modules/role/docs/role.system.doc';
import { RoleAbilitiesResponseDto } from '@modules/role/dtos/response/role.abilities.response.dto';
import { RoleHttpService } from '@modules/role/services/role.http.service';
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.system.role')
@Controller({
    version: '1',
    path: '/role',
})
export class RoleSystemController {
    constructor(private readonly roleHttpService: RoleHttpService) {}

    @RoleSystemGetAbilitiesDoc()
    @Response('role.getAbilities')
    @ApiKeySystemProtected()
    @Get('/get/:roleId/abilities')
    async getAbilities(
        @Param('roleId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        roleId: string
    ): Promise<IResponseReturn<RoleAbilitiesResponseDto>> {
        return this.roleHttpService.getAbilities(roleId);
    }
}
