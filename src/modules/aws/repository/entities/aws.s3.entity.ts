import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from '@common/database/decorators/database.decorator';
import { ENUM_AWS_S3_ACCESSIBILITY } from '@modules/aws/enums/aws.enum';

@DatabaseEntity({ timestamps: false, _id: false })
export class AwsS3Entity {
    @DatabaseProp({
        required: true,
        type: String,
    })
    bucket: string;

    @DatabaseProp({
        required: true,
        type: String,
    })
    key: string;

    @DatabaseProp({
        required: true,
        type: String,
    })
    completedUrl: string;

    @DatabaseProp({
        required: false,
        type: String,
    })
    cdnUrl?: string;

    @DatabaseProp({
        required: true,
        type: String,
    })
    mime: string;

    @DatabaseProp({
        required: true,
        type: String,
    })
    extension: string;

    @DatabaseProp({
        required: true,
        type: Number,
    })
    size: number;

    @DatabaseProp({
        required: true,
        type: String,
        enum: ENUM_AWS_S3_ACCESSIBILITY,
    })
    access: ENUM_AWS_S3_ACCESSIBILITY;
}

export const AwsS3Schema = DatabaseSchema(AwsS3Entity);
