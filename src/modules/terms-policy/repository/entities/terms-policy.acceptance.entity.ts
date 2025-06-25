import { IDatabaseDocument } from '@common/database/interfaces/database.interface';
import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';
import { UserEntity } from '@modules/user/repository/entities/user.entity';
import { DatabaseUUIDEntityBase } from '@common/database/bases/database.uuid.entity';
import { ENUM_TERMS_POLICY_TYPE } from '@modules/terms-policy/enums/terms-policy.enum';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';

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
        enum: ENUM_TERMS_POLICY_TYPE,
        required: true,
        index: true,
        type: String,
    })
    type: ENUM_TERMS_POLICY_TYPE;

    @DatabaseProp({
        type: String,
        required: true,
        index: true,
    })
    country: string;

    @DatabaseProp({
        enum: ENUM_MESSAGE_LANGUAGE,
        type: String,
        required: true,
        index: true,
    })
    language: ENUM_MESSAGE_LANGUAGE;

    @DatabaseProp({ required: true, type: Date })
    acceptedAt: Date;

    @DatabaseProp({ type: Number, required: true })
    version: number;
}

export type TermsPolicyAcceptanceDoc =
    IDatabaseDocument<TermsPolicyAcceptanceEntity>;
export const TermsPolicyAcceptanceSchema = DatabaseSchema(
    TermsPolicyAcceptanceEntity
);

// Updated index to ensure uniqueness at user+type+country level
TermsPolicyAcceptanceSchema.index({ user: 1, type: 1, country: 1 }, { unique: true });
