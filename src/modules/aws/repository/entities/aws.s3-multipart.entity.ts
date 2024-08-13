import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';
import {
    AwsS3MultipartPartEntity,
    AwsS3MultipartPartSchema,
} from 'src/modules/aws/repository/entities/aws.s3-multipart-part.entity';

@DatabaseEntity({ timestamps: false, _id: false })
export class AwsS3MultipartEntity {
    @DatabaseProp({
        required: true,
        type: String,
    })
    uploadId: string;

    @DatabaseProp({
        required: true,
        type: Number,
    })
    lastPartNumber: number;

    @DatabaseProp({
        required: true,
        type: Number,
    })
    maxPartNumber: number;

    @DatabaseProp({
        required: true,
        nullable: false,
        default: [],
        schema: AwsS3MultipartPartSchema,
    })
    parts: AwsS3MultipartPartEntity[];
}

export const AwsS3MultipartSchema = DatabaseSchema(AwsS3MultipartEntity);
