import {FluenceChat, HISTORY, Member, MODULE_CHAT, USER_ADDED, USER_LIST} from "./fluenceChat";
import {FluenceClient} from "fluence/dist/src/fluenceClient";
import {seedToPeerId} from "fluence/dist/src/seed";
import Fluence from "fluence/dist/src/fluence";
import {build} from "fluence/dist/src/particle";

// change these constants in different environment
const HISTORY_BLUEPRINT = "75c809a5-4ccb-4491-8555-27ec34c5829c";
const USER_LIST_BLUEPRINT = "75c809a5-4ccb-4491-8555-27ec34c5829c";

// parameters from `fluence-playground` local network
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

const CHAT_PEER_ID = relays[1].peerId

function scriptJoin(chatId: string, chatPeerId: string): string {
    return script(chatId, chatPeerId, "join", ["peerId", "relay", "sig", "name"])
}

function scriptGetChatPeer(): string {
    return ""
}

function scriptGetMembers(): string {
    return ""
}

function scriptGetHistory(): string {
    return ""
}

function chatIdToHistoryId(chatId: string) {
    return chatId + "_history"
}

function chatIdToUserListId(chatId: string) {
    return chatId + "_userlist"
}

function getMembersScript(chatPeerId: string, userListId: string, relay: string, client: string): string {
    return `(seq (
        (call ("${chatPeerId}" ("identity" "") () void[]))       
        (seq (
            (call ("${chatPeerId}" ("${userListId}" "get_members") (chat_id) members[]))
            (seq (
                (call ("${relay}" ("identity" "") () void[]))
                (call ("${client}" ("members" "") (members) void[]))
            ))
        ))        
    ))`
}

function genScript(chatId: string, serviceId: string, userListId: string, funcName: string, args: string[]): string {
    let argsStr = args.join(" ")
    let chatPeerId = relays[1].peerId
    return `
    (seq (
        (call ("${chatPeerId}" ("identity" "") () void[]))
        (seq (
            ( call ("${chatPeerId}" ("${serviceId}" "${funcName}") (${argsStr}) result )
            (seq (
                (call ("${chatPeerId}" ("${userListId}" "get_members") (chat_id) members[]))
                (fold (members m
                    (seq (
                        (seq (
                            (call (m.$.relay ("identity" "") () void[]))
                            (call (m.$.client_id ("${chatId}" ${funcName}) (${argsStr}) void[]))                            
                        ))                        
                        (next m)
                    ))                   
                ))
            ))
        ))
    ))
    `
}

async function createChat(name: string, relay: string, relayAddress: string, seed?: string): Promise<FluenceChat> {
    let clCreation = await connect(relays[1].multiaddr);
    let userListServiceId = await clCreation.createService(USER_LIST_BLUEPRINT);
    let historyServiceId = await clCreation.createService(HISTORY_BLUEPRINT);

    let chatId = Math.random().toString(36).substring(7);
    await clCreation.addProvider(Buffer.from(chatId + "_history", 'utf8'), relays[1].peerId, historyServiceId);
    await clCreation.addProvider(Buffer.from(chatId + "_userlist", 'utf8'), relays[1].peerId, userListServiceId);

    console.log("CHAT ID: " + chatId);

    let cl = await connect(relayAddress, seed);

    return new FluenceChat(cl, historyServiceId, userListServiceId, CHAT_PEER_ID, name, relay,[]);
}

async function connectToChat(chatId: string, relay: string, relayAddress: string, seed: string): Promise<FluenceChat> {
    let cl = await connect(relayAddress, seed);
}

async function joinChat(name: string, chatId: string, relay: string, relayAddress: string, seed?: string): Promise<FluenceChat> {
    let clInfo = await connect(relays[1].multiaddr);

    let historyId = await clInfo.getProviders(Buffer.from(chatIdToHistoryId(chatId), 'utf8'));
    let userListId = await clInfo.getProviders(Buffer.from(chatIdToUserListId(chatId), 'utf8'));

    let cl = await connect(relayAddress, seed);

    let script = genScript(chatId, chatIdToUserListId(chatId), userListId, "join", ["user", "relay", "sig", "name"])

    let particle = await build(cl.selfPeerId, script, {user: cl.selfPeerIdStr, relay: cl.connection.nodePeerId.toB58String, sig: cl.selfPeerIdStr, name: name})
    await cl.sendParticle(particle)

    return new FluenceChat(cl, historyId, userListId, CHAT_PEER_ID, name, relay,[]);
}

async function getMembers(client: FluenceClient, chatId: string): Promise<Member[]> {
    let membersStr = (await client.callService(CHAT_PEER_ID, chatId, USER_LIST, {}, "get_users")).result as string
    let members: Member[] = []
    let membersRaw = membersStr.split("|")
    membersRaw.forEach((v) => {
        let memberRaw = v.split(",")
        let member: Member = {
            clientId: memberRaw[1],
            relay: memberRaw[2],
            sig: memberRaw[3],
            name: memberRaw[4]
        }
        members.push(member);
    })
    return members;
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scenario() {
    console.log("start")
    let creator = await createChat("Alice", relays[1].peerId, relays[1].multiaddr)
    console.log("chat created")
    await delay(1000)
    let user = await joinChat("Bob", creator.serviceId, relays[2].peerId, relays[2].multiaddr)
    console.log("user joined")

    await delay(1000)

    console.log("creator send message")
    await creator.sendMessage("hello")
    await delay(1000)
    console.log("user send message")
    await user.sendMessage("hi")

    await user.reconnect(relays[0].multiaddr);

    console.log("creator send second message")
    await creator.sendMessage("how ya doin")
    await delay(1000)
    console.log("user send second message")
    await user.sendMessage("ama fine")

    await user.changeName("John")

    console.log("creator send second message")
    await creator.sendMessage("what is your name?")
    await delay(1000)
    console.log("user send second message")
    await user.sendMessage("Not Bob")

    let h1 = await creator.getHistory();
    console.log("history creator: " + JSON.stringify(h1))
    let h2 = await user.getHistory();
    console.log("history user: " + JSON.stringify(h2))
    let members = await getMembers(user.client, user.serviceId)
    console.log("members: " + JSON.stringify(members))
}

declare global {
    interface Window {
        joinChat: any;
        createChat: any;
        scenario: any;
        connectToChat: any;
        publishBlueprint: any;
    }
}

window.joinChat = joinChat;
window.createChat = createChat;
window.scenario = scenario;
window.connectToChat = connectToChat;
window.publishBlueprint = publishBlueprint;
// Fluence.setLogLevel('trace')

async function connect(relayAddress: string, seed?: string): Promise<FluenceClient> {
    let pid;
    if (seed) {
        pid = await seedToPeerId(seed);
    } else {
        pid = await Fluence.generatePeerId();
    }

    console.log("PID = " + pid.toB58String())

    return await Fluence.connect(relayAddress, pid);
}

// publishes a blueprint for chat application and shows its id
async function publishBlueprint() {
    let pid = await Fluence.generatePeerId();
    let cl = await Fluence.connect(relays[0].multiaddr, pid);

    let blueprintIdHistory = await cl.addBlueprint("user_list", ["sqlite", HISTORY])
    let blueprintIdUserList = await cl.addBlueprint("user_list", ["sqlite", USER_LIST])
    console.log(`BLUEPRINT HISTORY ID: ${blueprintIdHistory}`)
    console.log(`BLUEPRINT USER LIST ID: ${blueprintIdUserList}`)
}

