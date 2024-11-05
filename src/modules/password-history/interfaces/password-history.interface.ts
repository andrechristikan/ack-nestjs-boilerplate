import {
    PasswordHistoryDoc,
    PasswordHistoryEntity,
} from 'src/modules/password-history/repository/entities/password-history.entity';
import {
    UserDoc,
    UserEntity,
} from 'src/modules/user/repository/entities/user.entity';

export interface IPasswordHistoryEntity
    extends Omit<PasswordHistoryEntity, 'by'> {
    by: UserEntity;
}

export interface IPasswordHistoryDoc extends Omit<PasswordHistoryDoc, 'by'> {
    by: UserDoc;
}
