## How to run chat:
- Install workaround with Fluence nodes:
```
npx fluence-playground
```
- Run local Fluence network:
```
npm run fluence-playground
```
- Install a browser client in `client` dir 
```
cd client
npm install
```
- Run client
```
npm run start
```
- Open browser `localhost:8080`
- Use browser console to test chat scenario
```
scenario()
```
OR 
- User commands to manually connect to chat and send messages
```
    
    // local Fluence node addresses
    let relays = [
        {
            multiaddr: "/ip4/127.0.0.1/tcp/9001/ws/p2p/12D3KooWQ8x4SMBmSSUrMzY2m13uzC7UoSyvHaDhTKx7hH8aXxpt",
            peerId: "12D3KooWQ8x4SMBmSSUrMzY2m13uzC7UoSyvHaDhTKx7hH8aXxpt"
        },
        {
            multiaddr: "/ip4/127.0.0.1/tcp/9002/ws/p2p/12D3KooWGGv3ZkcbxNtM7jPzrtgxprd2Ws4zm9z1JkNSUwUgyaUN",
            peerId: "12D3KooWGGv3ZkcbxNtM7jPzrtgxprd2Ws4zm9z1JkNSUwUgyaUN"
        },
        {
            multiaddr: "/ip4/127.0.0.1/tcp/9003/ws/p2p/12D3KooWSGS1XxVx2fiYM5U66HKtF81ypbzA3v71jLBUVLZSNSNi",
            peerId: "12D3KooWSGS1XxVx2fiYM5U66HKtF81ypbzA3v71jLBUVLZSNSNi"
        }
    ]
    
    // create chat and connect with another user
    let creator = await createChat("Alice", relays[1].peerId, relays[1].multiaddr)
    // you can use this in different browser's tab
    let user = await joinChat("Bob", creator.serviceId, relays[2].peerId, relays[2].multiaddr)

    // send messages to chat
    await creator.sendMessage("hello")
    await user.sendMessage("hi")

    // you can reconnect to a different node
    await user.reconnect(relays[0].multiaddr);

    // change your name in a chat
    await user.changeName("John")

    // and get all chat history
    let h1 = await creator.getHistory();
    console.log("history creator: " + JSON.stringify(h1))
    let h2 = await user.getHistory();
    console.log("history user: " + JSON.stringify(h2)) // should be the same as creator's history
    
    // get chat members
    let members = await getMembers(user.client, user.serviceId)
    console.log("members: " + JSON.stringify(members))
```

// TODO: use preinstalled modules and blueprints somehow

