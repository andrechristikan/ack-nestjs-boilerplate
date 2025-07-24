import {
    ITermPolicyDoc,
    ITermPolicyEntity,
} from '@modules/term-policy/interfaces/term-policy.interface';
import {
    TermPolicyAcceptanceDoc,
    TermPolicyAcceptanceEntity,
} from '@modules/term-policy/repository/entities/term-policy-acceptance.entity';
import {
    UserDoc,
    UserEntity,
} from '@modules/user/repository/entities/user.entity';

export interface ITermPolicyAcceptanceEntity
    extends Omit<TermPolicyAcceptanceEntity, 'termPolicy' | 'user'> {
    termPolicy: ITermPolicyEntity;
    user: UserEntity;
}

export interface ITermPolicyAcceptanceDoc
    extends Omit<TermPolicyAcceptanceDoc, 'termPolicy' | 'user'> {
    termPolicy: ITermPolicyDoc;
    user: UserDoc;
}
