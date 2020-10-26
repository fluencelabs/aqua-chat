import Fluence from 'fluence/dist/fluence';
import {seedToPeerId} from "fluence/dist/seed";
import {FluenceClient} from "fluence/dist/fluenceClient";
import {Service} from "fluence/dist/callService";
import {build} from "fluence/dist/particle";
import {registerService} from "fluence/dist/globalState";
import {SQLITE} from "../../artifacts/sqlite.ts";
import {USER_LIST} from "../../artifacts/userList.ts";
import {HISTORY} from "../../artifacts/history.ts";

type Relay = { peerId: string; multiaddr: string };

// parameters from `fluence-playground` local network
let relays: Relay[] = [
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

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

declare global {
    interface Window {
        relays: Relay[]
        init: any
        addModules: any
        addBlueprint: any
        createService: any
        getModules: any
    }
}

const BP_ID = "d9078816-7519-4bcd-8481-0729231299c5";
const SERVICE_ID = "a0a94037-59bb-4f63-949c-a57068389c98"


window.relays = relays;
window.addModules = addModules;
window.addBlueprint = addBlueprint;
window.createService = createService;
window.getModules = getModules;
window.init = init;
Fluence.setLogLevel('trace')

export class AquaClient {

    client: FluenceClient;
    name: string

    constructor(name: string, client: FluenceClient) {
        this.client = client;
        this.name = name;
    }

    async sendMessage(pid: string, message: string) {
        let script = `(call (${pid} (chat show_message) (name message) result))`
        let particle = await build(this.client.selfPeerId, script, {name: this.name, message})
        await this.client.sendParticle(particle);
    }

    async sendScript(script: string, data: object) {
        let particle = await build(this.client.selfPeerId, script, data, 500000)
        await this.client.sendParticle(particle);
    }
}

async function getModules() {
    let pid = await Fluence.generatePeerId();
    let client = await Fluence.connect(relays[1].multiaddr, pid);

    let script = `(seq (
            ${client.nodeIdentityCall()}
            (seq (           
                (call ("${client.connection.nodePeerId.toB58String()}" ("get_available_modules" "") () modules))
                (call ("${client.selfPeerIdStr}" ("ababa" "") (modules aza) void1))
            ))
        ))
        `

    console.log(script)

    let particle = await build(client.selfPeerId, script, {aza: "df"})
    await client.sendParticle(particle)
}

async function addBlueprint() {
    let pid = await Fluence.generatePeerId();
    let client = await Fluence.connect(relays[1].multiaddr, pid);
    let bp_id = await client.addBlueprint("chat", ["sqlite", "history", "user-list"])
    console.log(bp_id)
}

async function createService() {
    let pid = await Fluence.generatePeerId();
    let client = await Fluence.connect(relays[1].multiaddr, pid);
    let cs = await client.createService(BP_ID)
    console.log(cs)
}

async function addModules() {
    let pid = await Fluence.generatePeerId();
    Fluence.setLogLevel("debug")
    let client = await Fluence.connect(relays[1].multiaddr, pid);
    // await client.addModule("sqlite", SQLITE, 20000)
    await client.addModule("user-list", USER_LIST)
    await client.addModule("history", HISTORY)
}

async function init(relay: number, name: string, seed?: string): Promise<AquaClient> {
    let pid;
    if (seed) {
        pid = await seedToPeerId(seed);
    } else {
        pid = await Fluence.generatePeerId();
    }

    console.log("PID: " + pid.toB58String())

    Fluence.setLogLevel('silent')
    let client = await Fluence.connect(relays[relay].multiaddr, pid);

    let service: Service = new Service("chat")
    service.registerFunction("show_message", (args: any[]) => {
        console.log(`[${args[0]}]: ` + args[1])
        return { result: "done" }
    })

    registerService(service);

    return new AquaClient(name, client)
}


