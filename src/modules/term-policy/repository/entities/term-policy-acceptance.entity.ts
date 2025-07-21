import { IDatabaseDocument } from '@common/database/interfaces/database.interface';
import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';
import { UserEntity } from '@modules/user/repository/entities/user.entity';
import { DatabaseUUIDEntityBase } from '@common/database/bases/database.uuid.entity';
import { TermPolicyEntity } from '@modules/term-policy/repository/entities/term-policy.entity';

const TermPolicyAcceptanceTableName = 'TermPolicyAcceptances';

@DatabaseEntity({
    collection: TermPolicyAcceptanceTableName,
})
export class TermPolicyAcceptanceEntity extends DatabaseUUIDEntityBase {
    @DatabaseProp({
        type: String,
        ref: UserEntity.name,
        required: true,
        index: true,
    })
    user: string;

    @DatabaseProp({
        type: String,
        ref: TermPolicyEntity.name,
        required: true,
        index: true,
    })
    termPolicy: string;

    @DatabaseProp({ required: true, type: Date })
    acceptedAt: Date;
}

export type TermPolicyAcceptanceDoc =
    IDatabaseDocument<TermPolicyAcceptanceEntity>;
export const TermPolicyAcceptanceSchema = DatabaseSchema(
    TermPolicyAcceptanceEntity
);

TermPolicyAcceptanceSchema.index({ user: 1, termPolicy: 1 }, { unique: true });
