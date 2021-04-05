import { Ability, InferSubjects } from '@casl/ability';
import { Action } from './casl.constant';
import { AbilityDetail } from 'src/ability/ability.interface';

export class UserAbility extends AbilityDetail {}
export class RoleAbility extends AbilityDetail {}

export type Subjects =
    | InferSubjects<typeof UserAbility | typeof UserAbility>
    | 'all';

export type AppAbility = Ability<[Action, Subjects]>;
