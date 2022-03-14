export interface People {
    id: number;
    name: string;
}

export interface Message {
    type: 'system' | 'public' | 'self',
    msg: string;
    name?: string;
    id: number;
}

export interface SendMsg {
    msg: string;
    id: number;
}