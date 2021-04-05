import {
    Ability,
    AbilityBuilder,
    AbilityClass,
    ExtractSubjectType,
    MongoQuery
} from '@casl/ability';
import { AnyObject } from '@casl/ability/dist/types/types';
import { Injectable } from '@nestjs/common';
import { UserDocumentFull } from 'src/user/user.interface';
import { Action } from './casl.constant';
import {
    AppAbility,
    RoleAbility,
    Subjects,
    UserAbility
} from './casl.interface';

@Injectable()
export class CaslService {
    createForUser(
        user: UserDocumentFull
    ): Ability<[Action, Subjects], MongoQuery<AnyObject>> {
        const { can, build } = new AbilityBuilder<Ability<[Action, Subjects]>>(
            Ability as AbilityClass<AppAbility>
        );

        if (user.isAdmin) {
            can(Action.Manage, 'all');
        } else if (user.role && user.role.isActive) {
            for (const ability of user.role.abilities) {
                if (ability.name === 'user' && ability.isActive) {
                    if (ability.details.read) {
                        can(Action.Read, UserAbility);
                    }
                    if (ability.details.create) {
                        can(Action.Create, UserAbility);
                    }
                    if (ability.details.update) {
                        can(Action.Update, UserAbility);
                    }
                    if (ability.details.delete) {
                        can(Action.Delete, UserAbility);
                    }
                }

                if (ability.name === 'role' && ability.isActive) {
                    if (ability.details.read) {
                        can(Action.Read, RoleAbility);
                    }
                    if (ability.details.create) {
                        can(Action.Create, RoleAbility);
                    }
                    if (ability.details.update) {
                        can(Action.Update, RoleAbility);
                    }
                    if (ability.details.delete) {
                        can(Action.Delete, RoleAbility);
                    }
                }
            }
        }

        return build({
            detectSubjectType: (item) =>
                item.constructor as ExtractSubjectType<Subjects>
        });
    }
}
