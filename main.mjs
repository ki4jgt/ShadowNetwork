#!/usr/bin/env node

// Foreward
//
// Code organization:
//
// I've never gotten the concept of breaking code up into tiny modules that you
// have to go looking for in order to fix something.
//
// My first coding language was BASIC, which lacked the concept of local
// variables, and all code was contained in a single file. Functions were
// basically running the interpreter between goto statements, while using
// conditional statements. Despite these limitations, I was easily able to code
// massive projects.
//
// I've evolved a tolerance for local variables, but breaking projects down into
// hundreds of modules and sub files is where I draw the line.
//
// You can think of this code as a chapter book. There's a logical order with
// plot-twists and cliff-hangers. Writing this book is art, not a place for you
// to show off your coding skills -- unless the flashiness adds to the literary
// theme in some way.
//
// I've left comments throughout the code to better acquaint you with book
// structure and framework. Feel free to make it your own. The main branch is my
// domain, and I will restructure as my intuition guides.
//
// If you don't like coding under these terms, maybe this project isn't for you?

// Imports (Preface)
// Imports are ordered by conceptual primitiveness to operating system.
import dgram from "node:dgram"
import net from "node:net"
import {createHash, generateKeyPair, createPublicKey, sign, verify} from "node:crypto"
import express from "express"
import pug from "pug"

// Table of Contents
//
// i. Conventions
// ii. Global Variables
// iii. Helper Functions and Classes
// 01. Formatting and Storage Logic
// 02. User Modules and Agency
// 03. Headless Server
// 04. Network Integration
// 05. Express Server (UI)
// 06. Roadmap

// i. Conventions
// Single chacter variables are not only permitted, but encouraged. As long as
// the chacter reflects the type of data it represents:
//
// i: integers
// s: strings
// d: dictionaries
// l: lists
// b: bytes
//
// Single character (or short) variables should be confined locally within
// functions. While properly named variables should cover global aspects of the
// program. Except in classes, where there will be a range of both.
// 
// Class functions which are never meant to be called externally should begin
// with an underscore (_).
//
// There are exceptions to everything -- it's art! Keep in mind that art is
// meant to be read and convey meaning to its reader. This network should remain
// open and easily modifiable to everyone. An open network creates an ecosystem
// that all can profit from. Think WordPress and how many businesses have arisen
// from it, because of ease of use and openness.

// ii. Global Variables
//
// Software versioning is yy.mm.dd.hh.mm. Since this is a rolling release, it's
// more beneficial for the user to be aware of their latest update, over the
// platform's latest major features.

const version = "26.03.01"

// iii. Helper Functions and Classes
function uid(data){
    return createHash("sha3-512").update(data).digest("hex").substring(0, 16).toUpperCase()
}
function pathify(uid){
    var path = ""
    for(let i=0; i<8; i++){
        path += `${uid.substring(i*2, i*2+2)}/`
    }
    return path.slice(0, -1)
}

class orderedDict{
    constructor(){
        this.list = []
        this.dict = {}
    }
    push(key, value){
        if (key in this.list){
            this.list.splice(this.list.indexOf(key), 1)
        }
        this.dict[key] = value
        this.list.push(key)
    }
    pull(key){
        return this.dict[key]
    }
    drop(key){
        if (key in this.list){
            this.list.splice(this.list.indexOf(key), 1)
            delete this.dict[key]
            return true
        }
        return false
    }
    shift(){
        s = this.list.shift()
        d = {[s]: this.dict[s]}
        delete this.dict[s]
        return d
    }
}

// 01 Formatting and Storage Logic
// Datablocks are stored in a database folder (db), with a path derived from
// their block uid (/XX/XX/XX/XX/XX/XX/XX/XX).

class datastore {
    constructor(path){

    }
    push(){

    }
    pull(){

    }
    _writer(){

    }
    _reader(){

    }
}

// 02 User Modules and Agency
//
// All accounts are agents exercising agency over their own individual
// publications within the network. The Agent class affirms and authenticates
// publication ownership.

class Agent{
    constructor(options){
        this.key = {}
        this.ID = ""
        if (options){
            this.key.public = options.publicKey
            this.key.private = options.privateKey
        }
        this._generate()
    }
    sign(data){
        return {key: this.key.public, data: data, signature: sign(null, data, this.key.private).toString("hex")}
    }
    verify(d){
        return verify(null, d.data, d.key, Buffer.from(d.signature, "hex"))
    }
    _generate(){
        if (this.key.private && !this.key.public){
            // Public keys are generated on-the-fly for user convenience.
            // Account backups only require saving a single file.
            this.key.public = createPublicKey({
                key: this.key.private,
                type: "spki",
                format: "pem"
            }).export({
                type: "spki",
                format: "pem"
            })
        }
        if (!this.key.private && !this.key.public){
            generateKeyPair("ed25519", {
                privateKeyEncoding: {
                    type: "pkcs8",
                    format: "pem"
                },
                publicKeyEncoding: {
                    type: "spki",
                    format: "pem"
                }
            }, (err, publicKey, privateKey) => {
                this.key.public = publicKey
                this.key.private = privateKey
                this.ID = uid(this.key.public)
            })
        }
        if(this.key.public){
            this.ID = uid(this.key.public)
        }
    }
}

// 03. Headless Server
// Shares datablocks and manifest file containing all agents server is
// subscribed to -- including ShadowNet publication server, where upgrades are
// received (disabled by default).

class server{
    constructor(){

        this.manifest = {}
        this.peers = []

        // Beacon server announces presence to network and discovers peers
        this.beacon = dgram.createSocket("udp4")
        setInterval(() => {
            this.beacon.send("shadownet", 5789, "255.255.255.255")
        }, 30000)
        this.beacon.on("message", (msg, rinfo) => {
            if (msg.toString() == "shadownet" && this.peers.indexOf(rinfo.address) == -1){
                this.peers.push(rinfo.address)
            }
        })
        this.beacon.on("listening", () => {
            this.beacon.setBroadcast(true)
        })
        this.beacon.bind(5789)

        // TCP Server hosts local manifest
        this.server = net.createServer(this._serverHandler.bind(this))
        this.server.listen(5789)
    }
    _serverHandler(conn){
        // HTTP not used because of unnecessary overhead
        //
        // - CONVERT STARTSWITH TO REGULAR EXPRESSIONS

        conn.on("data", (data) => {
            data = data.toString()
            if (data.toUpperCase().startsWith("/MANIFEST")){
                conn.write(JSON.stringify(this.manifest))
            }
            if (data.toUpperCase().startsWith("/BLOCK/")){
                // Return datablock (Formatting and Storage)
            }
            conn.end()
        })
    }
}

// 04. Network Integration
//
// Plans are for a LAN-based Reddit-style social network over WiFi/BlueTooth
// mesh networking. Then to eventually incorporate UDP holepunching allowing
// peers to connect over the Internet through LAN volunteers with port
// forwarding.

// 05. Express Server (UI)

// 06. Roadmap
//
// - Encrypted Private Key Storage
// - UI
// - LAN Mesh (B.A.T.M.A.N./Bluetooth)
// - P2P release upgrades (single signed file over mesh network)
// - Bridging to the Internet for global updates
// - P2P telephony, walkie-talkie, messaging, and data exchange

//var s = new server()
var a = new Agent()

setTimeout(() => {
    let signed = a.sign("I love you!")
    console.log(signed)
    console.log(a.verify(signed))
}, 5000)