import {
    ActivityDoc,
    ActivityEntity,
} from '@modules/activity/repository/entities/activity.entity';
import {
    UserDoc,
    UserEntity,
} from '@modules/user/repository/entities/user.entity';

export interface IActivityEntity extends Omit<ActivityEntity, 'by'> {
    by: UserEntity;
}

export interface IActivityDoc extends Omit<ActivityDoc, 'by'> {
    by: UserDoc;
}
