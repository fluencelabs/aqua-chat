import {FluenceChat, HISTORY_NAME, USER_LIST_NAME} from "./fluenceChat.ts";
import {FluenceClient} from "fluence/dist/src/fluenceClient";
import {peerIdToSeed, seedToPeerId} from "fluence/dist/src/seed";
import Fluence from "fluence/dist/src/fluence";
import {build} from "fluence/dist/src/particle";
import {SQLITE} from "../../artifacts/sqlite.ts";
import {HISTORY} from "../../artifacts/history.ts";
import {USER_LIST} from "../../artifacts/userList.ts";
import {Service} from "fluence/dist/src/callService";
import {registerService} from "fluence/dist/src/globalState";

// change these constants in different environment
const HISTORY_BLUEPRINT = "4b038731-7ecd-448e-b05d-8bf4b294f083";
const USER_LIST_BLUEPRINT = "1484d8b6-2c36-4691-956c-7b4640c0730f";

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

export const CHAT_PEER_ID = relays[1].peerId;

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

Fluence.setLogLevel('error')

async function createChat(name: string, relayAddress: string, seed?: string): Promise<FluenceChat> {
    let clCreation = await connect(relays[1].multiaddr, false);
    let userListId = await clCreation.createService(USER_LIST_BLUEPRINT);
    let historyId = await clCreation.createService(HISTORY_BLUEPRINT);

    let chatId = Math.random().toString(36).substring(7);
    await clCreation.addProvider(Buffer.from(chatIdToHistoryId(chatId), 'utf8'), relays[1].peerId, historyId);
    await clCreation.addProvider(Buffer.from(chatIdToUserListId(chatId), 'utf8'), relays[1].peerId, userListId);

    console.log("CHAT ID: " + chatId);

    let cl = await connect(relayAddress, true, seed);

    let chat =  new FluenceChat(cl, chatId, historyId, userListId, CHAT_PEER_ID, name, cl.connection.nodePeerId.toB58String());
    await chat.join();

    return chat;
}

async function getInfo(chatId: string): Promise<{ historyId: string; userListId: string }> {
    let clInfo = await connect(relays[1].multiaddr, false);

    let historyId = (await clInfo.getProviders(Buffer.from(chatIdToHistoryId(chatId), 'utf8')))[0][0].service_id;
    let userListId = (await clInfo.getProviders(Buffer.from(chatIdToUserListId(chatId), 'utf8')))[0][0].service_id;

    return { historyId, userListId }
}

async function connectToChat(chatId: string, relayAddress: string, seed: string): Promise<FluenceChat> {
    let info = await getInfo(chatId)

    let cl = await connect(relayAddress, true, seed);

    let chat = new FluenceChat(cl, chatId, info.historyId, info.userListId, CHAT_PEER_ID, name, cl.connection.nodePeerId.toB58String());
    await chat.getMembers();
    await chat.publishRelay();
    await chat.getHistory();

}

async function joinChat(name: string, chatId: string, relayAddress: string, seed?: string): Promise<FluenceChat> {
    let info = await getInfo(chatId)

    let cl = await connect(relayAddress, true, seed);

    let chat = new FluenceChat(cl, chatId, info.historyId, info.userListId, CHAT_PEER_ID, name, cl.connection.nodePeerId.toB58String());
    await chat.getMembers();
    await chat.join();
    await chat.getHistory();
    return chat;
}

async function getMembersCheck(chatId: string) {
    let cl = await connect(relays[1].multiaddr, false);
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

async function connect(relayAddress: string, printPid: boolean, seed?: string): Promise<FluenceClient> {
    let pid;
    if (seed) {
        pid = await seedToPeerId(seed);
    } else {
        pid = await Fluence.generatePeerId();
    }

    if (printPid) {
        console.log("SEED = " + peerIdToSeed(pid))
        console.log("PID = " + pid.toB58String())
    }

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

