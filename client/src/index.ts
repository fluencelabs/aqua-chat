import Fluence from "fluence/dist/fluence";

import {createChat, currentChat, joinChat, publishBlueprint} from "./globalFunctions";

// change these constants in different environment
export const HISTORY_BLUEPRINT = "f896116b-89a4-4fc2-989e-5105a32ac079";
export const USER_LIST_BLUEPRINT = "9e0d25a2-0314-4894-be71-db83b0147b7e";

// parameters from `fluence-playground` local network
export let relays = [
    {
        multiaddr: "/ip4/138.197.177.2/tcp/9001/ws/p2p/12D3KooWEXNUbCXooUwHrHBbrmjsrpHXoEphPwbjQXEGyzbqKnE9",
        peerId: "12D3KooWEXNUbCXooUwHrHBbrmjsrpHXoEphPwbjQXEGyzbqKnE9"
    },
    {
        multiaddr: "/ip4/138.197.177.2/tcp/9002/ws/p2p/12D3KooWHk9BjDQBUqnavciRPhAYFvqKBe4ZiPPvde7vDaqgn5er",
        peerId: "12D3KooWHk9BjDQBUqnavciRPhAYFvqKBe4ZiPPvde7vDaqgn5er"
    },
    {
        multiaddr: "/ip4/138.197.177.2/tcp/9003/ws/p2p/12D3KooWBUJifCTgaxAUrcM9JysqCcS4CS8tiYH5hExbdWCAoNwb",
        peerId: "12D3KooWBUJifCTgaxAUrcM9JysqCcS4CS8tiYH5hExbdWCAoNwb"
    },
    {
        multiaddr: "/ip4/138.197.177.2/tcp/9004/ws/p2p/12D3KooWJbJFaZ3k5sNd8DjQgg3aERoKtBAnirEvPV8yp76kEXHB",
        peerId: "12D3KooWJbJFaZ3k5sNd8DjQgg3aERoKtBAnirEvPV8yp76kEXHB"
    },
    {
        multiaddr: "/ip4/138.197.177.2/tcp/9005/ws/p2p/12D3KooWCKCeqLPSgMnDjyFsJuWqREDtKNHx1JEBiwaMXhCLNTRb",
        peerId: "12D3KooWCKCeqLPSgMnDjyFsJuWqREDtKNHx1JEBiwaMXhCLNTRb"
    },
    {
        multiaddr: "/ip4/138.197.177.2/tcp/9990/ws/p2p/12D3KooWMhVpgfQxBLkQkJed8VFNvgN4iE6MD7xCybb1ZYWW2Gtz",
        peerId: "12D3KooWMhVpgfQxBLkQkJed8VFNvgN4iE6MD7xCybb1ZYWW2Gtz"
    },
    {
        multiaddr: "/ip4/138.197.177.2/tcp/9100/ws/p2p/12D3KooWPnLxnY71JDxvB3zbjKu9k1BCYNthGZw6iGrLYsR1RnWM",
        peerId: "12D3KooWPnLxnY71JDxvB3zbjKu9k1BCYNthGZw6iGrLYsR1RnWM"
    }
]

export const CHAT_PEER_ID = relays[1].peerId;

Fluence.setLogLevel('error')

console.log(`
Welcome to Fluence Demo Chat Application
Use this commands to start:
let chat = await createChat("Your Name") // create a new chat instance and print your seed and new chat id
let chat = await joinChat("Your Name", "Chat Id") // join to an existing chat and print your seed

chat.sendMessage("Your Message") // send a message to all chat members
chat.changeName("New Name") // change your name

You can use your seed to reconnect to chat later or from other computer.
You can use a specific node to connect with.
let chat = createChat("Your Name", "SEED", "Node Multiaddr")
let chat = joinChat("Your Name", "CHAT ID", "SEED", "Node Multiaddr")

You can use preassigned node multiaddresses:
relays[0..6].multiaddr
`)

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
window.publishBlueprint = publishBlueprint;



