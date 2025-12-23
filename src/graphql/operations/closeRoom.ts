import { gql } from "@apollo/client"

export const ROOM_CLOSED = gql`
  subscription RoomClosed($roomId: ID!) {
    roomClosed(roomId: $roomId)
  }
`

export type RoomClosedData = {
  roomClosed: string
}

export type RoomClosedVars = {
  roomId: string
}