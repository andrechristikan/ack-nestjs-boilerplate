import { Policy } from '@generated/prisma-client';
import { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { IUser } from '@modules/user/interfaces/user.interface';

export interface IPolicyService {
    validatePolicyGuard(
        user: IUser | null,
        policies: Policy[] | null,
        requiredPolicies: PolicyRequestDto[]
    ): boolean;
    findManyByRole(roleId: string): Promise<Policy[]>;
    createByAdmin(roleId: string, data: PolicyRequestDto): Promise<Policy>;
    updateByAdmin(
        roleId: string,
        id: string,
        data: PolicyUpdateRequestDto
    ): Promise<Policy>;
    deleteByAdmin(roleId: string, id: string): Promise<Policy>;
}
