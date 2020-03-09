import { Room, Client } from "colyseus";
import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

import arrayMove from "array-move";

export enum PlayerStates {
  idle = "IDLE",
  play = "PLAYING",
  spec = "SPECTATING",
}

export enum RotationTypes {
  win = "WINNER",
  loose = "LOOSER",
  rand = "RANDOM"
}

export class Player extends Schema {
  @type("string")
  clientId: string = "";
  
  @type("number")
  wins: number = 0;

  @type("number")
  matches: number = 0;

  @type("string")
  address: string = "";

  @type("boolean")
  ready: boolean = false;

  @type("string")
  status: PlayerStates = PlayerStates.idle;
}

export class State extends Schema {
  @type([Player])
  players = new ArraySchema<Player>();

  @type("string")
  rotationType: RotationTypes = RotationTypes.win;

  @type(Player)
  creator?: Player;
}

export class GameRoom extends Room<State> {

  onCreate (options: any) {
    if (options.password) {
      this.setPrivate();
    }
    this.setState(new State());
  }

  onJoin (client: Client, options: any) {
    let player = new Player();
    player.clientId = client.sessionId;
    player.address = options.address;
    this.state.players.push(player);
  }

  onMessage (client: Client, message: any) {
    // Retrieve a previously stored player by their sessionId
    const sender = this.state.players.find(player => player.clientId === client.sessionId);
    if (!sender) {
      throw "Sender's player not found!";
    }

    switch (message.command) {
      case "ready":
        sender.ready = message.ready
        if (this.state.players[0].ready && this.state.players[1].ready) {
          this.state.players.forEach((player, index) => {
            const playerClient = this.clients.find((client) => client.sessionId = player.clientId)
            const hostAddress = this.state.players[0].address;
            let command;
            switch (index) {
              case 1:
                command = {command: "host"}
                break;
              case 2:
                command = {command: "join", address: hostAddress}
              default:
                command = {command: "spectate", address: hostAddress}
                break;
            }
            this.send(playerClient!, command)
          })
        }
        break;
      
      case "status":
        sender.status = message.status;
        break;

      case "matchEnd":
        const winner = message.winner--

        this.state.players[0].matches++
        this.state.players[1].matches++

        this.state.players[winner].wins++

        switch (this.state.rotationType) {
          case RotationTypes.win:
            // Winner stays
            arrayMove(this.state.players, winner == 1 ? 0 : 1, -1)
            break;
          case RotationTypes.loose:
            // Loser stays
            arrayMove(this.state.players, winner, -1)
          case RotationTypes.rand:
            arrayMove(this.state.players, Math.floor(Math.random() * 2), -1)
          default:
            break;
        }

        break;
      default:
        console.log(message);
        break;
    }
  }

  onLeave (client: Client, consented: boolean) {
  }

  onDispose() {
  }

}
