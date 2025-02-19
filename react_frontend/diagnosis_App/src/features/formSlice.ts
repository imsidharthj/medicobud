import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  name: "",
  age: "",
  symptoms: ["", "", ""],
  apiResponse: null,
  formErrors: {
    name: "",
    age: "",
    allergies: "",
    symptoms: ["", "", ""],
  },
};

const formSlice = createSlice({
  name: "form",
  initialState,
  reducers: {
    setName: (state, action) => {
      state.name = action.payload;
    },
    setAge: (state, action) => {
      state.age = action.payload;
    },
    setSymptom: (state, action) => {
      const { index, value } = action.payload;
      state.symptoms[index] = value;
    },
    setApiResponse: (state, action) => {
      state.apiResponse = action.payload;
    },
    setFormErrors: (state, action) => {
      state.formErrors = action.payload;
    },
    setAllergies: (state, action) => {
      console.log("*******");
    }
  },
});

export const { setName, setAge, setAllergies, setSymptom, setApiResponse, setFormErrors } = formSlice.actions;
export default formSlice.reducer;