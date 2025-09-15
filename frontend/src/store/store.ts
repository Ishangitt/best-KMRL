import { configureStore } from '@reduxjs/toolkit';

// TODO: Import slice reducers when they are created

export const store = configureStore({
  reducer: {
    // TODO: Add slices here
    // auth: authSlice.reducer,
    // schedule: scheduleSlice.reducer,
    // booking: bookingSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;