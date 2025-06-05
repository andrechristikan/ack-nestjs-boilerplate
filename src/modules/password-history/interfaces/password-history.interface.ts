import {
    PasswordHistoryDoc,
    PasswordHistoryEntity,
} from '@modules/password-history/repository/entities/password-history.entity';
import {
    UserDoc,
    UserEntity,
} from '@modules/user/repository/entities/user.entity';

export interface IPasswordHistoryEntity
    extends Omit<PasswordHistoryEntity, 'by'> {
    by: UserEntity;
}

export interface IPasswordHistoryDoc extends Omit<PasswordHistoryDoc, 'by'> {
    by: UserDoc;
}
