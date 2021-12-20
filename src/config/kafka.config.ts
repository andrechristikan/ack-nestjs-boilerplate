import { registerAs } from '@nestjs/config';

export default registerAs(
    'kafka',
    (): Record<string, any> => ({
        brokers: process.env.KAFKA_BROKERS
            ? process.env.KAFKA_BROKERS.split(',')
            : ['localhost:9092'],
        consumerGroup: process.env.KAFKA_CONSUMER_GROUP || 'nestjs.ack',
        clientId: 'KAFKA_ACK_CLIENT_ID',

        admin: {
            clientId: 'KAFKA_ADMIN_ACK_CLIENT_ID',
            defaultPartition: 3
        }
    })
);
