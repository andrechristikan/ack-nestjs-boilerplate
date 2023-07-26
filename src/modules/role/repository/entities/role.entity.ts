import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { CallbackWithoutResultAndOptionalError, Document } from 'mongoose';
import { DatabaseMongoUUIDEntityAbstract } from 'src/common/database/abstracts/mongo/entities/database.mongo.uuid.entity.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import { ENUM_POLICY_SUBJECT } from 'src/common/policy/constants/policy.enum.constant';
import { IPolicyRule } from 'src/common/policy/interfaces/policy.interface';
import { ENUM_ROLE_TYPE } from 'src/modules/role/constants/role.enum.constant';

export const RoleDatabaseName = 'roles';

@DatabaseEntity({ collection: RoleDatabaseName })
export class RoleEntity extends DatabaseMongoUUIDEntityAbstract {
    @Prop({
        required: true,
        index: true,
        unique: true,
        lowercase: true,
        trim: true,
        maxlength: 30,
        type: String,
    })
    name: string;

    @Prop({
        required: false,
        trim: true,
        type: String,
    })
    description?: string;

    @Prop({
        required: true,
        default: true,
        index: true,
        type: Boolean,
    })
    isActive: boolean;

    @Prop({
        required: true,
        enum: ENUM_ROLE_TYPE,
        index: true,
        type: String,
    })
    type: ENUM_ROLE_TYPE;

    @Prop({
        required: true,
        default: [],
        _id: false,
        type: [
            {
                subject: {
                    type: String,
                    enum: ENUM_POLICY_SUBJECT,
                    required: true,
                },
                action: {
                    type: Array,
                    required: true,
                    default: [],
                },
            },
        ],
    })
    permissions: IPolicyRule[];
}

export const RoleSchema = SchemaFactory.createForClass(RoleEntity);

export type RoleDoc = RoleEntity & Document;

RoleSchema.pre('save', function (next: CallbackWithoutResultAndOptionalError) {
    this.name = this.name.toLowerCase();

    next();
});
