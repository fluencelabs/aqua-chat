import Fluence from 'fluence/dist/src/fluence';
import {seedToPeerId} from "fluence/dist/src/seed";
import {FluenceClient} from "fluence/dist/src/fluenceClient";
import {Service} from "fluence/dist/src/callService";
import {build} from "fluence/dist/src/particle";
import {registerService} from "fluence/dist/src/globalState";

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
    }
}

window.relays = relays;
window.init = init;
// Fluence.setLogLevel('trace')

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
        this.client.sendParticle(particle);
    }

    async sendScript(script: string, data: object) {
        let particle = await build(this.client.selfPeerId, script, data)
        this.client.sendParticle(particle);
    }
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


