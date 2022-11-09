import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { CallbackWithoutResultAndOptionalError } from 'mongoose';
import { DatabaseMongoEntityAbstract } from 'src/common/database/abstracts/database.mongo-entity.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';

export const PermissionDatabaseName = 'permissions';

@DatabaseEntity({ collection: PermissionDatabaseName })
export class PermissionEntity extends DatabaseMongoEntityAbstract {
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
