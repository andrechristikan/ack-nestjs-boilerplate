import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { CallbackWithoutResultAndOptionalError } from 'mongoose';
import { DatabaseMongoUUIDEntityAbstract } from 'src/common/database/abstracts/mongo/database.mongo-uuid-entity.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';

export const PermissionDatabaseName = 'permissions';

@DatabaseEntity({ collection: PermissionDatabaseName })
export class PermissionEntity extends DatabaseMongoUUIDEntityAbstract {
    @Prop({
        required: true,
        index: true,
        unique: true,
        uppercase: true,
        trim: true,
        maxlength: 25,
        type: String,
    })
    code: string;

    @Prop({
        required: true,
        index: true,
        trim: true,
        enum: ENUM_PERMISSION_GROUP,
        type: String,
    })
    group: ENUM_PERMISSION_GROUP;

    @Prop({
        required: true,
        index: true,
        lowercase: true,
        trim: true,
        maxlength: 100,
        type: String,
    })
    name: string;

    @Prop({
        required: true,
        type: String,
        maxlength: 255,
    })
    description: string;

    @Prop({
        required: true,
        default: true,
        index: true,
        type: Boolean,
    })
    isActive: boolean;
}

export const PermissionSchema = SchemaFactory.createForClass(PermissionEntity);

PermissionSchema.pre(
    'save',
    function (next: CallbackWithoutResultAndOptionalError) {
        this.code = this.code.toUpperCase();
        this.name = this.name.toLowerCase();

        next();
    }
);
