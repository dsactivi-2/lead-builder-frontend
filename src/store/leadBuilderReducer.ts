import { Message, Understanding, Match, Artifacts, Template, LeadBuilderState } from '@/components/lead-builder/types';

export interface LeadBuilderStateType {
  messages: Message[];
  understanding: Understanding | null;
  matchCount: number;
  matches: Match[];
  artifacts: Artifacts | null;
  templates: Template[];
  state: LeadBuilderState;
  debugData: unknown;
  error: string | null;
}

export type LeadBuilderAction =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_STATE'; payload: LeadBuilderState }
  | { type: 'SET_UNDERSTANDING'; payload: Understanding }
  | { type: 'SET_MATCHES'; payload: { count: number; matches: Match[] } }
  | { type: 'SET_ARTIFACTS'; payload: Artifacts }
  | { type: 'SET_TEMPLATES'; payload: Template[] }
  | { type: 'ADD_TEMPLATE'; payload: Template }
  | { type: 'SET_DEBUG_DATA'; payload: unknown }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET' };

export const initialState: LeadBuilderStateType = {
  messages: [],
  understanding: null,
  matchCount: 0,
  matches: [],
  artifacts: null,
  templates: [],
  state: 'idle',
  debugData: null,
  error: null,
};

export function leadBuilderReducer(
  state: LeadBuilderStateType,
  action: LeadBuilderAction
): LeadBuilderStateType {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case 'SET_STATE':
      return {
        ...state,
        state: action.payload,
        error: action.payload === 'error' ? state.error : null,
      };

    case 'SET_UNDERSTANDING':
      return {
        ...state,
        understanding: action.payload,
      };

    case 'SET_MATCHES':
      return {
        ...state,
        matchCount: action.payload.count,
        matches: action.payload.matches,
      };

    case 'SET_ARTIFACTS':
      return {
        ...state,
        artifacts: action.payload,
      };

    case 'SET_TEMPLATES':
      return {
        ...state,
        templates: action.payload,
      };

    case 'ADD_TEMPLATE':
      return {
        ...state,
        templates: [...state.templates, action.payload],
      };

    case 'SET_DEBUG_DATA':
      return {
        ...state,
        debugData: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        state: 'error',
      };

    case 'RESET':
      return {
        ...initialState,
        templates: state.templates,
      };

    default:
      return state;
  }
}
