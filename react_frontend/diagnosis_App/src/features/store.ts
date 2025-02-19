// src/store.js
import { configureStore } from "@reduxjs/toolkit";
import formReducer from "./formSlice";

export const store = configureStore({
  reducer: {
    form: formReducer, // Add more reducers here if needed
  },
});