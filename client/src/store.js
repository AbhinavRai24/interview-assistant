import { configureStore, combineReducers } from '@reduxjs/toolkit';
import candidatesReducer from './slices/candidatesSlice';
import {
    persistStore,
    persistReducer,
} from 'redux-persist';
import localforage from 'localforage';

const persistConfig = {
    key: 'root',
    storage: localforage, // localforage uses IndexedDB internally
    whitelist: ['candidates']
};

const rootReducer = combineReducers({
    candidates: candidatesReducer
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (gdm) => gdm({ serializableCheck: false })
});

export const persistor = persistStore(store);