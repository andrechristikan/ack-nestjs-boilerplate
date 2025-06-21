import { IDatabaseDocument } from '@common/database/interfaces/database.interface';
import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';
import { UserEntity } from '@modules/user/repository/entities/user.entity';
import { TermsPolicyEntity } from '@modules/terms-policy/repository/entities/terms-policy.entity';
import { DatabaseUUIDEntityBase } from '@common/database/bases/database.uuid.entity';

const TermsPolicyAcceptanceCollectionName = 'TermsPolicyAcceptance';

@DatabaseEntity({
    collection: TermsPolicyAcceptanceCollectionName,
    timestamps: false,
})
export class TermsPolicyAcceptanceEntity extends DatabaseUUIDEntityBase {
    @DatabaseProp({
        type: String,
        ref: UserEntity.name,
        required: true,
        index: true,
    })
    user: string;

    @DatabaseProp({
        type: String,
        ref: TermsPolicyEntity.name,
        required: true,
        index: true,
    })
    policy: string;

    @DatabaseProp({ required: true, type: Date })
    acceptedAt: Date;
}

export type TermsPolicyAcceptanceDoc =
    IDatabaseDocument<TermsPolicyAcceptanceEntity>;
export const TermsPolicyAcceptanceSchema = DatabaseSchema(
    TermsPolicyAcceptanceEntity
);

TermsPolicyAcceptanceSchema.index({ user: 1, policy: 1 }, { unique: true });
