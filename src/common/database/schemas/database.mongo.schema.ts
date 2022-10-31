import { Prop } from '@nestjs/mongoose';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';

export class DatabaseMongoEntity {
    @Prop({
        type: String,
        default: DatabaseDefaultUUID,
    })
    _id: string;

    @Prop({
        required: false,
        index: true,
        type: Date,
    })
    deletedAt?: Date;
}
