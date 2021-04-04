import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AbilityDatabaseName } from 'src/ability/ability.schema';

@Schema()
export class RoleEntity {

    @Prop({
        required: true,
        index: true,
        unique: true,
        lowercase: true,
        trim: true
    })
    name: string;

    @Prop({
        required: true,
        type: [Types.ObjectId],
        default: [],
        ref: AbilityDatabaseName
    })
    abilities: Types.ObjectId[];
}

export const RoleDatabaseName = 'roles';
export const RoleSchema = SchemaFactory.createForClass(RoleEntity);
