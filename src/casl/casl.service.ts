import {
    Ability,
    AbilityBuilder,
    AbilityClass,
    ExtractSubjectType,
    MongoQuery
} from '@casl/ability';
import { AnyObject } from '@casl/ability/dist/types/types';
import { Injectable } from '@nestjs/common';
import { UserEntity } from 'src/user/user.schema';
import { Action } from './casl.constant';
import { AppAbility, Subjects, UserAbility } from './casl.interface';

@Injectable()
export class CaslService {
    createForUser(
        user: UserEntity
    ): Ability<[Action, Subjects], MongoQuery<AnyObject>> {
        const { can, build } = new AbilityBuilder<Ability<[Action, Subjects]>>(
            Ability as AbilityClass<AppAbility>
        );

        if (user.isAdmin) {
            can(Action.Manage, 'all');
        }

        can(Action.Read, UserAbility, { read: true });
        can(Action.Create, UserAbility, { create: true } );
        can(Action.Update, UserAbility, { update: true });
        can(Action.Delete, UserAbility, { delete: true } );

        return build({
            detectSubjectType: (item) =>
                item.constructor as ExtractSubjectType<Subjects>
        });
    }
}
