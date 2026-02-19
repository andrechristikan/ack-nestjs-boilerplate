import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IPolicyRequirement } from '@modules/policy/interfaces/policy.interface';

export interface IPolicyService {
    authorize(
        request: IRequestApp,
        requirements: IPolicyRequirement[]
    ): Promise<boolean>;
}
