import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';

import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { IDatabaseDocument } from '@common/database/interfaces/database.interface';
import { ENUM_TERMS_POLICY_TYPE } from '@modules/terms-policy/enums/terms-policy.enum';
import { DatabaseUUIDEntityBase } from '@common/database/bases/database.uuid.entity';

const TermsPolicyCollectionName = 'TermsPolicies';

@DatabaseEntity({
    collection: TermsPolicyCollectionName,
})
export class TermsPolicyEntity extends DatabaseUUIDEntityBase {
    @DatabaseProp({
        enum: ENUM_TERMS_POLICY_TYPE,
        required: true,
        index: true,
        type: String,
    })
    type: ENUM_TERMS_POLICY_TYPE;

    @DatabaseProp({ required: true })
    title: string;
    @DatabaseProp({ required: true })
    description: string;
    @DatabaseProp({
        enum: ENUM_MESSAGE_LANGUAGE,
        type: String,
        required: true,
        index: true,
    })
    language: ENUM_MESSAGE_LANGUAGE;

    @DatabaseProp({ required: true, index: true })
    version: number;

    @DatabaseProp({ required: true })
    content: string;

    @DatabaseProp({ type: Date })
    publishedAt?: Date;
}

export const TermsPolicySchema = DatabaseSchema(TermsPolicyEntity);
export type TermsPolicyDoc = IDatabaseDocument<TermsPolicyEntity>;

// Define a unique index for type, language, and version
TermsPolicySchema.index({ type: 1, language: 1, version: 1 }, { unique: true });
