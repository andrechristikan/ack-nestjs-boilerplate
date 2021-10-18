import { KAFKA_PRODUCER_TOPICS } from './producer/producer.constant';

export const KAFKA_TOPICS = [...new Set([...KAFKA_PRODUCER_TOPICS])].sort();
