//@ts-ignore
db.createUser({
    user: 'youruser',
    pwd: 'yourpassword',
    roles: [
        {
            role: 'readWrite',
            db: 'ack'
        }
    ]
});
