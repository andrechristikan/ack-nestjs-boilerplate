import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';

import { IDatabaseDocument } from '@common/database/interfaces/database.interface';
import {
    ENUM_TERM_POLICY_STATUS,
    ENUM_TERM_POLICY_TYPE,
} from '@modules/term-policy/enums/term-policy.enum';
import { DatabaseUUIDEntityBase } from '@common/database/bases/database.uuid.entity';
import {
    TermPolicyDocumentEntity,
    TermPolicyDocumentSchema,
} from '@modules/term-policy/repository/entities/term-policy-document.entity';
import { CountryEntity } from '@modules/country/repository/entities/country.entity';

const TermPolicyTableName = 'TermPolicies';

@DatabaseEntity({
    collection: TermPolicyTableName,
})
export class TermPolicyEntity extends DatabaseUUIDEntityBase {
    @DatabaseProp({
        enum: ENUM_TERM_POLICY_TYPE,
        required: true,
        index: true,
        type: String,
    })
    type: ENUM_TERM_POLICY_TYPE;

    @DatabaseProp({
        required: true,
        type: Array,
        default: [],
        schema: [TermPolicyDocumentSchema],
    })
    urls: TermPolicyDocumentEntity[];

    @DatabaseProp({
        type: String,
        required: true,
        index: true,
        ref: CountryEntity.name,
    })
    country: string;

    @DatabaseProp({ required: true, index: true })
    version: number;

    @DatabaseProp({
        enum: ENUM_TERM_POLICY_STATUS,
        required: true,
        index: true,
        type: String,
        default: ENUM_TERM_POLICY_STATUS.DRAFT,
    })
    status: ENUM_TERM_POLICY_STATUS;

    @DatabaseProp({ type: Date, required: false })
    publishedAt?: Date;
}

export const TermPolicySchema = DatabaseSchema(TermPolicyEntity);
export type TermPolicyDoc = IDatabaseDocument<TermPolicyEntity>;

TermPolicySchema.index({ type: 1, country: 1, version: 1 }, { unique: true });
