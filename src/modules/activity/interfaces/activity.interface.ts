import {
    ActivityDoc,
    ActivityEntity,
} from '@module/activity/repository/entities/activity.entity';
import {
    UserDoc,
    UserEntity,
} from '@module/user/repository/entities/user.entity';

export interface IActivityEntity extends Omit<ActivityEntity, 'by'> {
    by: UserEntity;
}

export interface IActivityDoc extends Omit<ActivityDoc, 'by'> {
    by: UserDoc;
}
