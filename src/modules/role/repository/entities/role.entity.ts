import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DatabaseMongoUUIDEntityAbstract } from 'src/common/database/abstracts/mongo/entities/database.mongo.uuid.entity.abstract';
import { DatabaseEntity } from 'src/common/database/decorators/database.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/common/policy/constants/policy.enum.constant';
import { RolePermissionDto } from 'src/modules/role/dtos/role.permission.dto';

export const RoleDatabaseName = 'roles';

@DatabaseEntity({ collection: RoleDatabaseName })
export class RoleEntity extends DatabaseMongoUUIDEntityAbstract {
    @Prop({
        required: true,
        index: true,
        unique: true,
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
        enum: ENUM_POLICY_ROLE_TYPE,
        index: true,
        type: String,
    })
    type: ENUM_POLICY_ROLE_TYPE;

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
                    required: true,
                    type: [
                        {
                            required: true,
                            type: String,
                            enum: ENUM_POLICY_ACTION,
                        },
                    ],
                },
            },
        ],
    })
    permissions: RolePermissionDto[];
}

export const RoleSchema = SchemaFactory.createForClass(RoleEntity);

export type RoleDoc = RoleEntity & Document;
