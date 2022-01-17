import { InjectConnection } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from './database.constant';

export function DatabaseConnection(): (
    target: Record<string, any>,
    key: string | symbol,
    index?: number
) => void {
    return InjectConnection(DATABASE_CONNECTION_NAME);
}
