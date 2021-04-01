import { Ability, InferSubjects } from '@casl/ability';
import { Action } from './casl.constant';

export class Permission {
    read: true;
    create: true;
    update: true;
    delete: true;
}

export class UserAbility extends Permission {}

export type Subjects = InferSubjects<typeof UserAbility> | 'all';

export type AppAbility = Ability<[Action, Subjects]>;
