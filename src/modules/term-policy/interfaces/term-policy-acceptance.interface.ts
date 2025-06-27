import {
  TermPolicyAcceptanceDoc,
  TermPolicyAcceptanceEntity,
} from '@modules/term-policy/repository/entities/term-policy-acceptance.entity';
import { TermPolicyDoc, TermPolicyEntity } from '@modules/term-policy/repository/entities/term-policy.entity';

export interface ITermPolicyAcceptanceEntity extends Omit<TermPolicyAcceptanceEntity, 'policy'> {
  policy: TermPolicyEntity;
}

export interface ITermPolicyAcceptanceDoc extends Omit<TermPolicyAcceptanceDoc, 'policy'> {
  policy: TermPolicyDoc;
}

