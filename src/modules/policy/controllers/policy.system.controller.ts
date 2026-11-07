import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';
import { Response } from '@common/response/decorators/response.decorator';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeySystemProtected } from '@modules/api-key/decorators/api-key.decorator';
import { PolicyListResponseSchema } from '@modules/policy/dtos/response/policy.list.response.dto';
import type { PolicyListResponseDto } from '@modules/policy/dtos/response/policy.list.response.dto';
import { PolicyListByRoleUseCase } from '@modules/policy/use-cases/policy.list-by-role.use-case';
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.system.role.policy')
@Controller({
    version: '1',
    path: '/role/:roleId/policy',
})
export class PolicySystemController {
    constructor(
        private readonly policyListByRoleUseCase: PolicyListByRoleUseCase
    ) {}

    @Doc({ summary: 'get all policies granted by a role' })
    @Response('policy.listByRole', { schema: PolicyListResponseSchema })
    @ApiKeySystemProtected()
    @Get('/list')
    async listByRole(
        @Param('roleId', { schema: RequestMongoIdSchema })
        roleId: string
    ): Promise<IResponseReturn<PolicyListResponseDto>> {
        return this.policyListByRoleUseCase.execute(roleId);
    }
}
