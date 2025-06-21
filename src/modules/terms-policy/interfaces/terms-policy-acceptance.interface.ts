import {
  TermsPolicyAcceptanceDoc,
  TermsPolicyAcceptanceEntity,
} from '@modules/terms-policy/repository/entities/terms-policy.acceptance.entity';
import { TermsPolicyDoc, TermsPolicyEntity } from '@modules/terms-policy/repository/entities/terms-policy.entity';

export interface ITermsPolicyAcceptanceEntity extends Omit<TermsPolicyAcceptanceEntity, 'policy'> {
  policy: TermsPolicyEntity;
}

export interface ITermsPolicyAcceptanceDoc extends Omit<TermsPolicyAcceptanceDoc, 'policy'> {
  policy: TermsPolicyDoc;
}

