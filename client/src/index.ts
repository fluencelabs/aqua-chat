import {FluenceChat, HISTORY_NAME, Member, MODULE_CHAT, USER_ADDED, USER_LIST_NAME} from "./fluenceChat.ts";
import {FluenceClient} from "fluence/dist/src/fluenceClient";
import {seedToPeerId} from "fluence/dist/src/seed";
import Fluence from "fluence/dist/src/fluence";
import {build} from "fluence/dist/src/particle";
import {SQLITE} from "../../artifacts/sqlite.ts";
import {HISTORY} from "../../artifacts/history.ts";
import {USER_LIST} from "../../artifacts/userList.ts";
import {Service} from "fluence/dist/src/callService";
import {registerService} from "fluence/dist/src/globalState";

// change these constants in different environment
const HISTORY_BLUEPRINT = "a35cb40d-12ec-4137-b176-db954a03ddd5";
const USER_LIST_BLUEPRINT = "fd909e5a-9680-4cab-b416-81e5291b2eaf";

// parameters from `fluence-playground` local network
let relays = [
    {
        multiaddr: "/ip4/134.209.186.43/tcp/9001/ws/p2p/12D3KooWEXNUbCXooUwHrHBbrmjsrpHXoEphPwbjQXEGyzbqKnE9",
        peerId: "12D3KooWEXNUbCXooUwHrHBbrmjsrpHXoEphPwbjQXEGyzbqKnE9"
    },
    {
        multiaddr: "/ip4/134.209.186.43/tcp/9002/ws/p2p/12D3KooWHk9BjDQBUqnavciRPhAYFvqKBe4ZiPPvde7vDaqgn5er",
        peerId: "12D3KooWHk9BjDQBUqnavciRPhAYFvqKBe4ZiPPvde7vDaqgn5er"
    },
    {
        multiaddr: "/ip4/134.209.186.43/tcp/9003/ws/p2p/12D3KooWBUJifCTgaxAUrcM9JysqCcS4CS8tiYH5hExbdWCAoNwb",
        peerId: "12D3KooWBUJifCTgaxAUrcM9JysqCcS4CS8tiYH5hExbdWCAoNwb"
    },
    {
        multiaddr: "/ip4/134.209.186.43/tcp/9004/ws/p2p/12D3KooWJbJFaZ3k5sNd8DjQgg3aERoKtBAnirEvPV8yp76kEXHB",
        peerId: "12D3KooWJbJFaZ3k5sNd8DjQgg3aERoKtBAnirEvPV8yp76kEXHB"
    },
    {
        multiaddr: "/ip4/134.209.186.43/tcp/9005/ws/p2p/12D3KooWCKCeqLPSgMnDjyFsJuWqREDtKNHx1JEBiwaMXhCLNTRb",
        peerId: "12D3KooWCKCeqLPSgMnDjyFsJuWqREDtKNHx1JEBiwaMXhCLNTRb"
    },
    {
        multiaddr: "/ip4/134.209.186.43/tcp/9990/ws/p2p/12D3KooWMhVpgfQxBLkQkJed8VFNvgN4iE6MD7xCybb1ZYWW2Gtz",
        peerId: "12D3KooWMhVpgfQxBLkQkJed8VFNvgN4iE6MD7xCybb1ZYWW2Gtz"
    },
    {
        multiaddr: "/ip4/134.209.186.43/tcp/9100/ws/p2p/12D3KooWPnLxnY71JDxvB3zbjKu9k1BCYNthGZw6iGrLYsR1RnWM",
        peerId: "12D3KooWPnLxnY71JDxvB3zbjKu9k1BCYNthGZw6iGrLYsR1RnWM"
    }
]

const CHAT_PEER_ID = relays[1].peerId;

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
    return `
    (seq (
        (call ("${chatPeerId}" ("identity" "") () void[]))       
        (seq (
            (call ("${chatPeerId}" ("${userListId}" "get_users") () members))
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
            (call ("${chatPeerId}" ("${serviceId}" "${funcName}") (${argsStr}) void[]))
            (seq (
                (call ("${chatPeerId}" ("${userListId}" "get_users") () members))
                (fold (members m
                    (seq (
                        (seq (
                            (call (m.$.[1] ("identity" "") () void[]))
                            (call (m.$.[0] ("${chatId}" "${funcName}") (${argsStr}) void[]))                            
                        ))                        
                        (next m)
                    ))                   
                ))
            ))
        ))
    ))
    `
}

// Fluence.setLogLevel('debug')

async function join(name: string, chatId: string, userListServiceId: string, cl: FluenceClient) {
    let script = genScript(chatId, userListServiceId, userListServiceId, "join", ["user", "relay", "sig", "name"])
    let particle = await build(cl.selfPeerId, script, {user: cl.selfPeerIdStr, relay: cl.connection.nodePeerId.toB58String(), sig: cl.selfPeerIdStr, name: name})
    await cl.sendParticle(particle)
}

async function createChat(name: string, relayAddress: string, seed?: string): Promise<FluenceChat> {
    let clCreation = await connect(relays[1].multiaddr);
    let userListServiceId = await clCreation.createService(USER_LIST_BLUEPRINT);
    let historyServiceId = await clCreation.createService(HISTORY_BLUEPRINT);

    let chatId = Math.random().toString(36).substring(7);
    await clCreation.addProvider(Buffer.from(chatIdToHistoryId(chatId), 'utf8'), relays[1].peerId, historyServiceId);
    await clCreation.addProvider(Buffer.from(chatIdToUserListId(chatId), 'utf8'), relays[1].peerId, userListServiceId);

    console.log("CHAT ID: " + chatId);

    let cl = await connect(relayAddress, seed);

    await join(name, chatId, userListServiceId, cl)

    let members = getMembers(cl, userListServiceId);

    return new FluenceChat(cl, chatId, historyServiceId, userListServiceId, CHAT_PEER_ID, name, cl.connection.nodePeerId.toB58String(),[]);
}

/*async function connectToChat(chatId: string, relay: string, relayAddress: string, seed: string): Promise<FluenceChat> {
    let cl = await connect(relayAddress, seed);
}*/

async function joinChat(name: string, chatId: string, relayAddress: string, seed?: string): Promise<FluenceChat> {
    let clInfo = await connect(relays[1].multiaddr);

    let historyId = (await clInfo.getProviders(Buffer.from(chatIdToHistoryId(chatId), 'utf8')))[0][0].service_id;
    let userListId = (await clInfo.getProviders(Buffer.from(chatIdToUserListId(chatId), 'utf8')))[0][0].service_id;

    let cl = await connect(relayAddress, seed);

    await join(name, chatId, userListId, cl)

    let members = getMembers(cl, userListId);

    return new FluenceChat(cl, chatId, historyId, userListId, CHAT_PEER_ID, name, cl.connection.nodePeerId.toB58String(),[]);
}

async function getMembersCheck(chatId: string) {
    let cl = await connect(relays[1].multiaddr);
    let userListId = await cl.getProviders(Buffer.from(chatIdToUserListId(chatId), 'utf8'));
    console.log("user list id: " + userListId);
    console.log(userListId);
    await getMembers(cl, userListId[0][0].service_id)
}

async function getMembers(client: FluenceClient, userListId: string): Promise<any> {
    let service = new Service("members")
    service.registerFunction("", (args: any[]) => {
        console.log("MEMBERS:")
        console.log(args)
        return {}
    })
    registerService(service)
    let getMembersScr = getMembersScript(CHAT_PEER_ID, userListId, client.connection.nodePeerId.toB58String(), client.selfPeerIdStr)
    let particleGetMembers = await build(client.selfPeerId, getMembersScr, {})
    let members = await client.sendParticle(particleGetMembers)

    console.log(members)
    return members
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/*async function scenario() {
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
}*/

declare global {
    interface Window {
        joinChat: any;
        createChat: any;
        relays: any;
        scenario: any;
        connectToChat: any;
        getMembersCheck: any;
        publishBlueprint: any;
    }
}

window.joinChat = joinChat;
window.createChat = createChat;
window.relays = relays;
window.getMembersCheck = getMembersCheck;
// window.scenario = scenario;
// window.connectToChat = connectToChat;
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
    let cl = await Fluence.connect(relays[1].multiaddr, pid);

    await cl.addModule("sqlite", SQLITE);
    await cl.addModule(HISTORY_NAME, HISTORY);
    await cl.addModule(USER_LIST_NAME, USER_LIST);

    let blueprintIdHistory = await cl.addBlueprint("user_list", ["sqlite", HISTORY_NAME])
    let blueprintIdUserList = await cl.addBlueprint("user_list", ["sqlite", USER_LIST_NAME])
    console.log(`BLUEPRINT HISTORY ID: ${blueprintIdHistory}`)
    console.log(`BLUEPRINT USER LIST ID: ${blueprintIdUserList}`)
}

