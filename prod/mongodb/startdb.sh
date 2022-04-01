
#!/bin/bash

docker-compose -f docker-compose.mongo.yml up -d

sleep 5

docker exec mongo1 /scripts/rs-init.sh