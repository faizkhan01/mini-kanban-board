export type BoardRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Task {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string | null;
  position: number;
}

export interface Column {
  id: string;
  boardId: string;
  name: string;
  position: number;
  tasks: Task[];
}

export interface BoardMember {
  id: string;
  userId: string;
  role: BoardRole;
  user: User;
}

export interface BoardSummary {
  id: string;
  name: string;
  ownerId: string;
  owner: User;
  myRole: BoardRole;
  updatedAt: string;
  _count: { columns: number; tasks: number };
}

export interface BoardDetail {
  id: string;
  name: string;
  ownerId: string;
  owner: User;
  members: BoardMember[];
  columns: Column[];
  myRole: BoardRole;
}
