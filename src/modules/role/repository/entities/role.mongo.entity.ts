import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { CallbackWithoutResultAndOptionalError } from 'mongoose';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { DatabaseMongoEntityAbstract } from 'src/common/database/abstracts/database.mongo-entity.abstract';
import { DatabaseMongoSchema } from 'src/common/database/decorators/database.decorator';
import { PermissionMongoEntity } from 'src/modules/permission/repository/entities/permission.mongo.entity';
import { RoleDatabaseName } from 'src/modules/role/repository/entities/role.entity';

@DatabaseMongoSchema({ collection: RoleDatabaseName })
export class RoleMongoEntity extends DatabaseMongoEntityAbstract {
    @Prop({
        required: true,
        index: true,
        unique: true,
        lowercase: true,
        trim: true,
        maxlength: 100,
        type: String,
    })
    name: string;

    @Prop({
        required: true,
        default: [],
        type: Array<string>,
        ref: PermissionMongoEntity.name,
    })
    permissions: string[];

    @Prop({
        required: true,
        default: true,
        index: true,
        type: Boolean,
    })
    isActive: boolean;

    @Prop({
        required: true,
        enum: ENUM_AUTH_ACCESS_FOR,
        index: true,
        type: String,
    })
    accessFor: ENUM_AUTH_ACCESS_FOR;
}

export const RoleMongoSchema = SchemaFactory.createForClass(RoleMongoEntity);

RoleMongoSchema.pre(
    'save',
    function (next: CallbackWithoutResultAndOptionalError) {
        this.name = this.name.toLowerCase();

        next();
    }
);
