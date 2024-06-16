import {
    DatabaseEntity,
    DatabaseProp,
    DatabaseSchema,
} from 'src/common/database/decorators/database.decorator';

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
    path: string;

    @DatabaseProp({
        required: true,
        type: String,
    })
    pathWithFilename: string;

    @DatabaseProp({
        required: true,
        type: String,
    })
    filename: string;

    @DatabaseProp({
        required: true,
        type: String,
    })
    completedUrl: string;

    @DatabaseProp({
        required: true,
        type: String,
    })
    baseUrl: string;

    @DatabaseProp({
        required: true,
        type: String,
    })
    mime: string;

    @DatabaseProp({
        required: false,
        type: Number,
    })
    duration?: number;

    @DatabaseProp({
        required: true,
        type: Number,
    })
    size: number;
}

export const AwsS3Schema = DatabaseSchema(AwsS3Entity);
