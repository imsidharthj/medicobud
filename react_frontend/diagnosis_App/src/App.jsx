import React, { useState } from 'react';
import Form from './Form';
import Response from './Response';
import { useDispatch, useSelector } from "react-redux";
import { setApiResponse, setFormErrors } from "./features/formSlice";

function App() {
  const dispatch = useDispatch();
  const { apiResponse, name, age, symptoms } = useSelector((state) => state.form);


  // const [formData, setFormData] = useState({
  //   name: '',
  //   age: '',
  //   allergies: '',
  //   symptoms: ['', '', ''], // Initial three symptoms
  // });

  // const [formErrors, setFormErrors] = useState({
  //   name: '',
  //   age: '',
  //   allergies: '',
  //   symptoms: ['', '', ''],
  // });

  // const [apiResponse, setApiResponse] = useState(null); // State to store API response
  
  // const handleChange = (e) => {
  //   const { name, value } = e.target;
  //   setFormData((prevData) => ({
  //     ...prevData,
  //     [name]: value,
  //   }));
  // };

  // Handle symptoms change dynamically
  // const handleSymptomChange = (index, value) => {
  //   const updatedSymptoms = [...formData.symptoms];
  //   updatedSymptoms[index] = value;
  //   setFormData({
  //     ...formData,
  //     symptoms: updatedSymptoms,
  //   });
  // };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // Validate form data
    
    const errors = {
      name: "",
      age: "",
      symptoms: [], // Initialize symptoms as an empty array
    };
  
    if (!name) errors.name = "Name is required";
    if (!age) errors.age = "Age is required";
    symptoms.forEach((symptom, index) => {
      if (!symptom) {
        errors.symptoms[index] = `Symptom ${index + 1} is required`; // Set the error message
      }
    });
  
    // Check if there are any errors
    if (errors.name || errors.age || errors.symptoms.length > 0) {
      dispatch(setFormErrors(errors));
      return;
    }
  
    // Make API request
    try {
      console.log("Making API request...");
      const response = await fetch("http://127.0.0.1:8000/diagnosis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          age: parseInt(age, 10),
          symptoms: symptoms.filter((symptom) => symptom.trim() !== ""),
        }),
      });
  
      console.log("API response status:", response.status);
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const data = await response.json();
      console.log("API response data:", data);
      dispatch(setApiResponse(data));
    } catch (error) {
      console.error("Error fetching data:", error);
      dispatch(setApiResponse({ error: "Failed to fetch data from the API." }));
    }
  };

  return (
    <div className="App" style={{ display: 'flex', textAlign: 'left' }}>
      <div style={{ flex: 8 }}>
      <h1>Patient Information Form</h1>
      <Form
        // formData={formData}
        // formErrors={formErrors}
        // handleChange={handleChange}
        // handleSymptomChange={handleSymptomChange}
        handleSubmit={handleSubmit}
      />
      </div>

      {/* Display API response */}
      <div style={{ flex: 4 }}>
      {apiResponse && (
        <div className="api-response">
          <h2>API Response:</h2>
          {/* {apiResponse.error ? (
          <p style={{ color: 'red' }}>{apiResponse.error}</p>
        ) : (
          <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
        )} */}
          <Response response={apiResponse}/>
        </div>
      )}
      </div>
    </div>
  );
}

export default App;