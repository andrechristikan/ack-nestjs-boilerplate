import {
    PasswordHistoryDoc,
    PasswordHistoryEntity,
} from '@module/password-history/repository/entities/password-history.entity';
import {
    UserDoc,
    UserEntity,
} from '@module/user/repository/entities/user.entity';

export interface IPasswordHistoryEntity
    extends Omit<PasswordHistoryEntity, 'by'> {
    by: UserEntity;
}

export interface IPasswordHistoryDoc extends Omit<PasswordHistoryDoc, 'by'> {
    by: UserDoc;
}
