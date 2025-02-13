import React from 'react';

const Response = ({ response }) => {
  if (!response) {
    return <div>No response data available.</div>;
  }

  const { name, age, symptoms, matched_diseases } = response;

  return (
    <div className="response-container">
      <h2>Diagnosis Result</h2>
      <p><strong>Name:</strong> {name}</p>
      <p><strong>Age:</strong> {age}</p>
      <p><strong>Symptoms:</strong> {symptoms.join(', ')}</p>
      <h3>Matched Diseases:</h3>
      <ul>
        {matched_diseases.map((disease, index) => (
          <li key={index}>{disease}</li>
        ))}
      </ul>
    </div>
  );
};

export default Response;
