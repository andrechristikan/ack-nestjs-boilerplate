import { RequestIsValidUuidPipe } from '@common/request/pipes/request.is-valid-uuid.pipe';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeySystemProtected } from '@modules/api-key/decorators/api-key.decorator';
import { PolicySystemListByRoleDoc } from '@modules/policy/docs/policy.system.doc';
import {
    PolicyListResponseDto,
    PolicyListResponseSchema,
} from '@modules/policy/dtos/response/policy.list.response.dto';
import { PolicyHttpService } from '@modules/policy/services/policy.http.service';
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.system.role.policy')
@Controller({
    version: '1',
    path: '/role/:roleId/policy',
})
export class PolicySystemController {
    constructor(private readonly policyHttpService: PolicyHttpService) {}

    @PolicySystemListByRoleDoc()
    @Response('policy.listByRole', { schema: PolicyListResponseSchema })
    @ApiKeySystemProtected()
    @Get('/list')
    async listByRole(
        @Param('roleId', RequestRequiredPipe, RequestIsValidUuidPipe)
        roleId: string
    ): Promise<IResponseReturn<PolicyListResponseDto>> {
        return this.policyHttpService.listByRole(roleId);
    }
}
