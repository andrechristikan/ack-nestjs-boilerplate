import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';
import { IDatabaseDocument } from '@common/database/interfaces/database.interface';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { AwsS3Entity } from '@modules/aws/repository/entities/aws.s3.entity';

@DatabaseEntity({
    _id: false,
    timestamps: false,
})
export class TermPolicyDocumentEntity extends AwsS3Entity {
    @DatabaseProp({
        required: true,
        type: String,
        enum: ENUM_MESSAGE_LANGUAGE,
    })
    language: ENUM_MESSAGE_LANGUAGE;
}

export const TermPolicyDocumentSchema = DatabaseSchema(
    TermPolicyDocumentEntity
);
export type TermPolicyDocumentDoc = IDatabaseDocument<TermPolicyDocumentEntity>;
