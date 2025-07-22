import {
    TermPolicyAcceptanceDoc,
    TermPolicyAcceptanceEntity,
} from '@modules/term-policy/repository/entities/term-policy-acceptance.entity';
import {
    TermPolicyDoc,
    TermPolicyEntity,
} from '@modules/term-policy/repository/entities/term-policy.entity';
import {
    UserDoc,
    UserEntity,
} from '@modules/user/repository/entities/user.entity';

export interface ITermPolicyAcceptanceEntity
    extends Omit<TermPolicyAcceptanceEntity, 'policy' | 'user'> {
    policy: TermPolicyEntity;
    user: UserEntity;
}

export interface ITermPolicyAcceptanceDoc
    extends Omit<TermPolicyAcceptanceDoc, 'policy' | 'user'> {
    policy: TermPolicyDoc;
    user: UserDoc;
}
