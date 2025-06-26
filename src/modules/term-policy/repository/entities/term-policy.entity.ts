import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';

import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { IDatabaseDocument } from '@common/database/interfaces/database.interface';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';
import { DatabaseUUIDEntityBase } from '@common/database/bases/database.uuid.entity';

const TermPolicyCollectionName = 'TermPolicies';

@DatabaseEntity({
    collection: TermPolicyCollectionName,
})
export class TermPolicyEntity extends DatabaseUUIDEntityBase {
    @DatabaseProp({
        enum: ENUM_TERM_POLICY_TYPE,
        required: true,
        index: true,
        type: String,
    })
    type: ENUM_TERM_POLICY_TYPE;

    @DatabaseProp({ required: true })
    title: string;
    @DatabaseProp({ required: true })
    description: string;

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

    @DatabaseProp({ required: true, index: true })
    version: number;

    @DatabaseProp({ required: true })
    content: string;

    @DatabaseProp({ type: Date })
    publishedAt?: Date;
}

export const TermPolicySchema = DatabaseSchema(TermPolicyEntity);
export type TermPolicyDoc = IDatabaseDocument<TermPolicyEntity>;

TermPolicySchema.index({ type: 1, language: 1, country: 1, version: 1 }, { unique: true });
