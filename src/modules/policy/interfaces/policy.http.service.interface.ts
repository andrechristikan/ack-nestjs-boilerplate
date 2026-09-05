import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { PolicyDto } from '@modules/policy/dtos/policy.dto';
import { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { PolicyListResponseDto } from '@modules/policy/dtos/response/policy.list.response.dto';

export interface IPolicyHttpService {
    listByRole(roleId: string): Promise<IResponseReturn<PolicyListResponseDto>>;
    createByAdmin(
        roleId: string,
        body: PolicyRequestDto
    ): Promise<IResponseReturn<PolicyDto>>;
    updateByAdmin(
        roleId: string,
        id: string,
        body: PolicyUpdateRequestDto
    ): Promise<IResponseReturn<PolicyDto>>;
    deleteByAdmin(roleId: string, id: string): Promise<IResponseReturn<void>>;
}
