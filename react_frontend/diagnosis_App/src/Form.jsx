import React from 'react';
import { useDispatch, useSelector } from "react-redux";
import { setName, setAge,setAllergies, setSymptom } from "./features/formSlice"
// import store from "./features/store";

// const store = configureStore({
//   reducer: {
//     form: formReducer,
//   },
// });

function Form({ handleSubmit }) {
  const dispatch = useDispatch();
  const { name, age, allergies, symptoms, formErrors } = useSelector(
    (state) => state.form
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "name") {
      dispatch(setName(value));
    } else if (name === "age") {
      dispatch(setAge(value));
    } else if (name === "allergies") {
      dispatch(setAllergies(value));
    }
  };

  const handleSymptomChange = (index, value) => {
    dispatch(setSymptom({ index, value }));
  };

  // Render symptoms dynamically
  const renderSymptoms = () => {
    return symptoms.map((symptom, index) => (
      <div key={index}>
        <label>Symptom {index + 1}:</label>
        <input
          type="text"
          // name={`symptom${index + 1}`}
          value={symptom}
          onChange={(e) => handleSymptomChange(index, e.target.value)}
        />
        {formErrors.symptoms && formErrors.symptoms[index] && (
          <span style={{ color: "red" }}>{formErrors.symptoms[index]}</span>
        )}
      </div>
    ));
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Name:</label>
        <input
          type="text"
          name="name"
          value={name}
          onChange={handleChange}
        />
        {formErrors.name && <span style={{ color: 'red' }}>{formErrors.name}</span>}
      </div>

      <div>
        <label>Age:</label>
        <input
          type="number"
          name="age"
          value={age}
          onChange={handleChange}
        />
        {formErrors.age && <span style={{ color: 'red' }}>{formErrors.age}</span>}
      </div>

      <div>
        <label>Allergies:</label>
        <input
          type="text"
          name="allergies"
          value={allergies}
          onChange={handleChange}
        />
        {formErrors.allergies && <span style={{ color: 'red' }}>{formErrors.allergies}</span>}
      </div>

      {renderSymptoms()}

      <button type="submit">Submit</button>
    </form>
  );
}

export default Form;