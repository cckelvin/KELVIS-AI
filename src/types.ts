export type PersonalityType = "fun" | "roast" | "zen" | "normal";

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface GroundingMetadata {
  chunks?: GroundingChunk[];
  supports?: any[];
  queries?: string[];
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  personality?: PersonalityType;
  isError?: boolean;
  isWarning?: boolean;
  grounding?: GroundingMetadata;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  created: number;
  personality: PersonalityType;
  webSearch: boolean;
}
