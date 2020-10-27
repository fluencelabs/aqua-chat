import {FluenceChat, HISTORY_NAME, USER_LIST_NAME} from "./fluenceChat.ts";
import {FluenceClient} from "fluence/dist/fluenceClient";
import {peerIdToSeed, seedToPeerId} from "fluence/dist/seed";
import Fluence from "fluence/dist/fluence";
import {SQLITE} from "../../artifacts/sqlite.ts";
import {HISTORY} from "../../artifacts/history.ts";
import {USER_LIST} from "../../artifacts/userList.ts";

// change these constants in different environment
const HISTORY_BLUEPRINT = "6936e9df-6c2d-4bd6-93e9-1e69aa9748bd";
const USER_LIST_BLUEPRINT = "7b4d57b0-57bc-4a65-85ae-b9d6e6033871";

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

let currentChat: FluenceChat | undefined = undefined;

export const CHAT_PEER_ID = relays[1].peerId;

function chatIdToHistoryId(chatId: string) {
    return chatId + "_history"
}

function chatIdToUserListId(chatId: string) {
    return chatId + "_userlist"
}

Fluence.setLogLevel('error')

function getRandomRelayAddr(): string {
    let relay = Math.floor(Math.random() * relays.length)
    return relays[relay].multiaddr
}

// Create a new chat. Chat Id will be printed in a console.
// New peer id will be generated with empty 'seed'. Random relay address will be used with empty 'relayAddress'
async function createChat(name: string, seed?: string, relayAddress?: string): Promise<FluenceChat> {
    checkCurrentChat();
    let clCreation = await connect(relays[1].multiaddr, false);
    let userListId = await clCreation.createService(USER_LIST_BLUEPRINT);
    let historyId = await clCreation.createService(HISTORY_BLUEPRINT);

    let chatId = Math.random().toString(36).substring(7);
    await clCreation.addProvider(Buffer.from(chatIdToHistoryId(chatId), 'utf8'), relays[1].peerId, historyId);
    await clCreation.addProvider(Buffer.from(chatIdToUserListId(chatId), 'utf8'), relays[1].peerId, userListId);

    console.log("CHAT ID: " + chatId);

    if (!relayAddress) {
        relayAddress = getRandomRelayAddr()
        console.log(`Connect to random node: ${relayAddress}`)
    }

    let cl = await connect(relayAddress, true, seed);

    let chat =  new FluenceChat(cl, chatId, historyId, userListId, CHAT_PEER_ID, name, cl.connection.nodePeerId.toB58String());
    await chat.join();

    currentChat = chat;

    return chat;
}

// Get an info about chat providers from Kademlia network.
async function getInfo(chatId: string): Promise<{ historyId: string; userListId: string }> {
    let clInfo = await connect(relays[1].multiaddr, false);

    let historyId = (await clInfo.getProviders(Buffer.from(chatIdToHistoryId(chatId), 'utf8')))[0][0].service_id;
    let userListId = (await clInfo.getProviders(Buffer.from(chatIdToUserListId(chatId), 'utf8')))[0][0].service_id;

    return { historyId, userListId }
}

// Throws an error if the chat client been already created.
function checkCurrentChat() {
    if (currentChat) {
        throw new Error("Chat is already created. Use 'chat' variable to use it. Or refresh page to create a new one.")
    }
}

// Join to existed chat. New peer id will be generated with empty 'seed'. Random relay address will be used with empty 'relayAddress'
async function joinChat(name: string, chatId: string, seed?: string, relayAddress?: string): Promise<FluenceChat> {
    checkCurrentChat();
    let info = await getInfo(chatId)

    if (!relayAddress) {
        relayAddress = getRandomRelayAddr()
        console.log(`Connect to random node: ${relayAddress}`)
    }

    let cl = await connect(relayAddress, true, seed);

    let chat = new FluenceChat(cl, chatId, info.historyId, info.userListId, CHAT_PEER_ID, name, cl.connection.nodePeerId.toB58String());
    await chat.updateMembers();
    await chat.join();
    await chat.getHistory();

    currentChat = chat;

    return chat;
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
        chat: any
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
window.chat = currentChat;
// window.scenario = scenario;
window.publishBlueprint = publishBlueprint;

// Connect to one of the node. Generate seed if it is undefined.
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

// Publishes a blueprint for chat application and shows its id
async function publishBlueprint() {
    let pid = await Fluence.generatePeerId();
    let cl = await Fluence.connect(relays[1].multiaddr, pid);

    await cl.addModule("sqlite", SQLITE, undefined, 20000);
    await cl.addModule(HISTORY_NAME, HISTORY, undefined, 20000);
    await cl.addModule(USER_LIST_NAME, USER_LIST, undefined, 20000);

    let blueprintIdHistory = await cl.addBlueprint("user_list", ["sqlite", HISTORY_NAME])
    let blueprintIdUserList = await cl.addBlueprint("user_list", ["sqlite", USER_LIST_NAME])
    console.log(`BLUEPRINT HISTORY ID: ${blueprintIdHistory}`)
    console.log(`BLUEPRINT USER LIST ID: ${blueprintIdUserList}`)
}

