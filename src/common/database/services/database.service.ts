import { Injectable } from '@nestjs/common';
import mongoose, { ConnectionStates } from 'mongoose';
import { IDatabaseService } from 'src/common/database/interfaces/database.service.interface';

@Injectable()
export class DatabaseService implements IDatabaseService {
    checkMongoConnection(): ConnectionStates {
        return mongoose.connection.readyState;
    }
}
