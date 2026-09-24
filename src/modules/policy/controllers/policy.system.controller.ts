import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import { Response } from '@common/response/decorators/response.decorator';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeySystemProtected } from '@modules/api-key/decorators/api-key.decorator';
import { PolicyListResponseSchema } from '@modules/policy/dtos/response/policy.list.response.dto';
import type { PolicyListResponseDto } from '@modules/policy/dtos/response/policy.list.response.dto';
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

    @Doc({ summary: 'get all policies granted by a role' })
    @Response('policy.listByRole', { schema: PolicyListResponseSchema })
    @ApiKeySystemProtected()
    @Get('/list')
    async listByRole(
        @Param('roleId', { schema: RequestUuidSchema })
        roleId: string
    ): Promise<IResponseReturn<PolicyListResponseDto>> {
        return this.policyHttpService.listByRole(roleId);
    }
}
