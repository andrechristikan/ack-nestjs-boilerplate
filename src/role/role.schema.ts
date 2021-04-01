import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AbilityDatabaseName, AbilityEntity } from 'src/ability/ability.schema';

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

    @Prop({ type: [Types.ObjectId], default: [], ref: AbilityDatabaseName })
    abilities: AbilityEntity[];
}

export const RoleDatabaseName = 'roles';
export const RoleSchema = SchemaFactory.createForClass(RoleEntity);
