import {FluenceClient} from "fluence/dist/src/fluenceClient";
import {registerService} from "fluence/dist/src/globalState";
import {Service} from "fluence/dist/src/callService";

const NAME_CHANGED = "NAME_CHANGED"
const RELAY_CHANGED = "RELAY_CHANGED"
export const USER_ADDED = "USER_ADDED"
const USER_DELETED = "USER_DELETED"
const MESSAGE = "MESSAGE"
export const MODULE_CHAT = "CHAT"
export const HISTORY_NAME = "history"
export const USER_LIST_NAME = "user-list"

export interface Member {
    clientId: string,
    relay: string,
    sig: string,
    name: string
}

export class FluenceChat {

    client: FluenceClient
    historyServiceId: string
    userListServiceId: string
    chatId: string
    name: string
    relay: string
    chatPeerId: string
    members: Member[]

    constructor(client: FluenceClient, chatId: string, historyServiceId: string, userListServiceId: string, peerId: string, name: string, relay: string, members: Member[]) {
        this.client = client;
        this.name = name;
        this.historyServiceId = historyServiceId;
        this.userListServiceId = userListServiceId;
        this.members = members.filter(m => m.clientId !== this.client.selfPeerIdStr);
        this.relay = relay;
        this.chatPeerId = peerId;
        this.chatId = chatId;

        let service = new Service(this.chatId)
        service.registerFunction("join", (args: any[]) => {
            let m = args;
            let member = {
                clientId: m[0],
                relay: m[1],
                sig: m[2],
                name: m[3]
            }
            console.log(`Member added to ${this.name}: ` + JSON.stringify(member))
            this.addMember(member);
            return {}
        })

        service.registerFunction("name_changed", (args: any[]) => {
            let member = this.members.filter(m => m.clientId === args[0])[0];
            if (member) {
                member.name = args[1];
                this.addMember(member);
                console.log("Name changed: " + args[0])
            } else {
                console.log("Cannot change name. There is no member: " + JSON.stringify(member))
            }
            return {}
        })

        service.registerFunction("relay_changed", (args: any[]) => {
            let clientId = args[0]
            let member = this.members.filter(m => m.clientId === clientId)[0];
            this.addMember(member);
            if (member) {
                member.relay = args[1];
                member.sig = args[2];
                this.members.push(member);
                console.log("Relay changed: " + clientId)
            } else {
                console.log("Cannot change relay. There is no member: " + JSON.stringify(member))
            }
            return {}
        })

        service.registerFunction("user_deleted", (args: any[]) => {
            console.log("Member deleted: " + args[0])
            this.deleteMember(args[0]);
            return {}
        })

        service.registerFunction("message", (args: any[]) => {
            console.log("message received to " + this.name)
            let m = this.members.find(m => m.clientId === args[0])
            if (m) {
                console.log(`${m.name}: ${args[1]}`)
            }
            return {}
        })

        registerService(service)
    }

    async changeName(name: string) {
        let clientId = this.client.selfPeerIdStr;
        this.name = name;
        let script = `
        
        `
        // await this.client.callService(this.chatPeerId, this.serviceId, USER_LIST, [clientId, name, clientId], "change_name")
        await this.sendToAll({clientId: clientId, name: name}, NAME_CHANGED)
    }

    /**
     * Publishes current relay to a chat.
     */
    async publishRelay() {
        let clientId = this.client.selfPeerIdStr;
        let relay = this.client.connection.nodePeerId.toB58String();
        let sig = this.client.selfPeerIdStr
        // await this.client.callService(this.chatPeerId, this.serviceId, USER_LIST, [clientId, relay, sig, clientId], "change_relay")
        await this.sendToAll({clientId: clientId, relay: relay, sig: sig}, RELAY_CHANGED)
    }

    /**
     * Reconnects to other relay and publish new relay address.
     * @param multiaddr
     */
    async reconnect(multiaddr: string) {
        await this.client.connect(multiaddr);
        await this.publishRelay();
    }

    private deleteMember(clientId: string) {
        this.members = this.members.filter(m => m.clientId !== clientId)
    }

    private addMember(member: Member) {
        if (member.clientId !== this.client.selfPeerIdStr) {
            this.members = this.members.filter(m => m.clientId !== member.clientId)
            this.members.push(member)
        }
    }

    async deleteUser(user: string) {
        // await this.client.callService(this.chatPeerId, this.serviceId, USER_LIST, [user, user], "delete")
        this.deleteMember(user)
    }

    async getHistory(): Promise<any> {
        // return await this.client.callService(this.chatPeerId, this.serviceId, HISTORY, [], "get_all")
    }

    private async sendToAll(args: any, fname: string) {
        for (const member of this.members) {
            console.log(`send command '${fname}' to: ` + JSON.stringify(member))
            // await this.client.fireClient(member.relay, member.clientId, member.sig, MODULE_CHAT, args, fname)
        }
    }

    async sendMessage(msg: string) {
        // await this.client.callService(this.chatPeerId, this.serviceId, HISTORY, [this.client.selfPeerIdStr, msg], "add")
        await this.sendToAll({
            clientId: this.client.selfPeerIdStr,
            message: msg
        }, MESSAGE);
    }
}
