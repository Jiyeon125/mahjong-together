export type MemberType = "THREE" | "FOUR" | "ANY";

export type GameType = "EAST" | "SOUTH" | "ANY";

export type TableStatus = "RECRUITING" | "READY" | "CLOSED" | "CANCELLED" | "EXPIRED";

export type MahjongTable = {
  id: string;
  title: string;
  hostUserId: string;
  hostNickname: string;
  memberType: MemberType;
  minPlayers: number;
  maxPlayers: number;
  startTime: string;
  endTime: string;
  gameType: GameType;
  description?: string;
  status: TableStatus;
  createdAt: string;
  updatedAt: string;
};

export type Participant = {
  id: string;
  tableId: string;
  userId: string;
  nickname: string;
  joinedAt: string;
};

export type CurrentUser = {
  userId: string;
  nickname: string;
};

export type FilterType = "ALL" | "THREE" | "FOUR" | "ANY" | "RECRUITING" | "READY";
