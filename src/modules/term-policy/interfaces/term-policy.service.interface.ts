import { TermPolicyDoc } from '@modules/term-policy/repository/entities/term-policy.entity';
import { IDatabaseFindOneOptions } from '@common/database/interfaces/database.interface';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';

export interface ITermPolicyService {
    findOnePublished(
        type: ENUM_TERM_POLICY_TYPE,
        country: string,
        options?: IDatabaseFindOneOptions
    ): Promise<TermPolicyDoc>;
}
