import { createSlice } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

const initialState = {
    list: [] 
};

const candidatesSlice = createSlice({
    name: 'candidates',
    initialState,
    reducers: {
        addCandidate(state, action) {
            state.list.push(action.payload);
        },
        updateCandidate(state, action) {
            const { id, changes } = action.payload;
            const idx = state.list.findIndex(c => c.id === id);
            if (idx >= 0) state.list[idx] = { ...state.list[idx], ...changes };
        },
        addChatMessage(state, action) {
            const { id, message } = action.payload;
            const c = state.list.find(c => c.id === id);
            if (c) {
                if (!c.chatHistory) c.chatHistory = [];
                c.chatHistory.push(message);
                c.lastSeenAt = Date.now();
            }
        },
        addQuestion(state, action) {
            const { id, question } = action.payload;
            const c = state.list.find(c => c.id === id);
            if (c) {
                if (!c.questions) c.questions = [];
                c.questions.push(question);
            }
        },
        setCandidateStatus(state, action) {
            const { id, status } = action.payload;
            const c = state.list.find(c => c.id === id);
            if (c) c.status = status;
        },
        removeCandidate(state, action) {
            state.list = state.list.filter(c => c.id !== action.payload.id);
        },
        resetState(state, action) {
            return initialState;
        }
    }
});

export const {
    addCandidate, updateCandidate, addChatMessage, addQuestion,
    setCandidateStatus, removeCandidate, resetState
} = candidatesSlice.actions;
export default candidatesSlice.reducer;