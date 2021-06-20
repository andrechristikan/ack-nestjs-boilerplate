//@ts-ignore
db.createUser({
    user: 'ack',
    pwd: 'ack123',
    roles: [
        {
            role: 'readWrite',
            db: 'ack'
        }
    ]
});
