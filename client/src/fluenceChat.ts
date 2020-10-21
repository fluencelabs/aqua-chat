import {FluenceClient} from "fluence/dist/src/fluenceClient";
import {registerService} from "fluence/dist/src/globalState";
import {Service} from "fluence/dist/src/callService";
import {build} from "fluence/dist/src/particle";
import {CHAT_PEER_ID} from "./index.ts";

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
    historyId: string
    userListId: string
    chatId: string
    name: string
    relay: string
    chatPeerId: string
    members: Member[]

    constructor(client: FluenceClient, chatId: string, historyId: string, userListId: string, peerId: string, name: string, relay: string) {
        this.client = client;
        this.name = name;
        this.historyId = historyId;
        this.userListId = userListId;
        this.members = [];
        this.relay = relay;
        this.chatPeerId = peerId;
        this.chatId = chatId;

        let service = new Service(this.chatId)
        service.registerFunction("join", (args: any[]) => {
            let m;
            if (Array.isArray(args[0])) {
                m = args[0]
            } else {
                m = args
            }
            let member = {
                clientId: m[0],
                relay: m[1],
                sig: m[2],
                name: m[3]
            }
            this.addMember(member);
            return {}
        })

        service.registerFunction("change_name", (args: any[]) => {
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

        service.registerFunction("all_msgs", (args: any[]) => {
            args[0].forEach((v: any) => {
                let name;
                if (v[2] === this.client.selfPeerIdStr) {
                    name = "Me"
                } else {
                    name = this.members.find(m => m.clientId === v[2])?.name
                }
                if (name) {
                    console.log(`${name}: ${v[1]}`)
                }
            })

            return {}
        })

        service.registerFunction("change_relay", (args: any[]) => {
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

        service.registerFunction("add", (args: any[]) => {
            let m = this.members.find(m => m.clientId === args[0])
            if (m) {
                console.log(`${m.name}: ${args[1]}`)
            }
            return {}
        })

        registerService(service)
    }

    async join() {
        let script = this.genScript(this.userListId, "join", ["user", "relay", "sig", "name"])
        let particle = await build(this.client.selfPeerId, script, {user: this.client.selfPeerIdStr, relay: this.client.connection.nodePeerId.toB58String(), sig: this.client.selfPeerIdStr, name: this.name})
        await this.client.sendParticle(particle)
    }

    async getMembers() {
        let chatPeerId = CHAT_PEER_ID;
        let relay = this.client.connection.nodePeerId.toB58String();
        let script = `
                (seq (
                    (call ("${chatPeerId}" ("identity" "") () void1[]))
                    (seq (
                        (call ("${chatPeerId}" ("${this.userListId}" "get_users") () members))
                        (fold (members m
                            (par (
                                (seq (
                                    (call ("${relay}" ("identity" "") () void[]))
                                    (call ("${this.client.selfPeerIdStr}" ("${this.chatId}" "join") (m) void3[]))                            
                                ))                        
                                (next m)
                            ))    
                        ))               
                    ))
                ))
                `

        let particle = await build(this.client.selfPeerId, script, {})
        await this.client.sendParticle(particle)
    }

    async changeName(name: string) {
        let user = this.client.selfPeerIdStr;
        let signature = this.client.selfPeerIdStr

        let script = this.genScript(this.historyId, "change_name", ["user", "name", "signature"])
        let particle = await build(this.client.selfPeerId, script, {user, name, signature})
        await this.client.sendParticle(particle)
    }

    /**
     * Publishes current relay to a chat.
     */
    async publishRelay() {
        let user = this.client.selfPeerIdStr;
        let relay = this.client.connection.nodePeerId.toB58String();
        let sig = this.client.selfPeerIdStr

        let script = this.genScript(this.historyId, "change_relay", ["user", "relay", "sig", "signature"])
        let particle = await build(this.client.selfPeerId, script, {user, relay, sig, signature: sig})
        await this.client.sendParticle(particle)
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
            if (this.members.find((m) => m.clientId === member.clientId)) {
                console.log(`Member joined: ${member.name}`)
            }
            this.members = this.members.filter(m => m.clientId !== member.clientId)
            this.members.push(member)
        }
    }

    async deleteUser(user: string) {

        let script = this.genScript(this.historyId, "delete", ["user", "signature"])
        let particle = await build(this.client.selfPeerId, script, {user, signature: user})
        await this.client.sendParticle(particle)

        this.deleteMember(user)
    }

    async getHistory(): Promise<any> {
        let chatPeerId = CHAT_PEER_ID;
        let relay = this.client.connection.nodePeerId.toB58String();
        let script = `
                (seq (
                    (call ("${chatPeerId}" ("identity" "") () void1[]))
                    (seq (
                        (call ("${chatPeerId}" ("${this.historyId}" "get_all") () messages))                       
                        (seq (
                            (call ("${relay}" ("identity" "") () void[]))
                            (call ("${this.client.selfPeerIdStr}" ("${this.chatId}" "all_msgs") (messages) void3[]))                            
                        ))                                                                           
                    ))
                ))
                `

        let particle = await build(this.client.selfPeerId, script, {})
        await this.client.sendParticle(particle)
    }

    async sendMessage(msg: string) {
        let script = this.genScript(this.historyId, "add", ["author", "msg"])
        let particle = await build(this.client.selfPeerId, script, {author: this.client.selfPeerIdStr, msg: msg})
        console.log("Me: ", msg)
        await this.client.sendParticle(particle)
    }

    genScript(serviceId: string, funcName: string, args: string[]): string {
        let argsStr = args.join(" ")
        let chatPeerId = CHAT_PEER_ID
        return `
                (seq (
                    (call ("${chatPeerId}" ("identity" "") () void1[]))
                    (seq (
                        (call ("${chatPeerId}" ("${serviceId}" "${funcName}") (${argsStr}) void2[]))
                        (seq (
                            (call ("${chatPeerId}" ("${this.userListId}" "get_users") () members))
                            (fold (members m
                                (par (
                                    (seq (
                                        (call (m.$.[1] ("identity" "") () void[]))
                                        (call (m.$.[0] ("${this.chatId}" "${funcName}") (${argsStr}) void3[]))                            
                                    ))                        
                                    (next m)
                                ))                   
                            ))
                        ))
                    ))
                ))
                `
    }
}
