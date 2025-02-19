import React from 'react';

interface ResponseProps {
  response: {
    name?: string;
    age?: number;
    symptoms?: string[];
    matched_diseases?: string[];
    error?: string;
  };
}

function Response({ response }: ResponseProps) {
  if (!response) {
    return <div>No response data available.</div>;
  }

  if (response.error) {
    return <div style={{ color: 'red' }}>{response.error}</div>;
  }

  return (
    <div>
      <h3>Diagnosis Results:</h3>
      <p><strong>Name:</strong> {response.name || 'N/A'}</p>
      <p><strong>Age:</strong> {response.age || 'N/A'}</p>
      <p><strong>Symptoms:</strong> {response.symptoms ? response.symptoms.join(', ') : 'N/A'}</p>
      <p><strong>Matched Diseases:</strong> {response.matched_diseases ? response.matched_diseases.join(', ') : 'N/A'}</p>
    </div>
  );
}

export default Response;