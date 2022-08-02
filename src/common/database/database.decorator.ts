import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from './constants/database.constant';

export function DatabaseConnection(
    connectionName?: string
): (target: Record<string, any>, key: string | symbol, index?: number) => void {
    return InjectConnection(connectionName || DATABASE_CONNECTION_NAME);
}

export function DatabaseEntity(
    entity: string,
    connectionName?: string
): (target: Record<string, any>, key: string | symbol, index?: number) => void {
    return InjectModel(entity, connectionName || DATABASE_CONNECTION_NAME);
}
