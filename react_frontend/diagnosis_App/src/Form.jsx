import React from 'react';

function Form({ formData, formErrors, handleChange, handleSymptomChange, handleSubmit }) {
  // Render symptoms dynamically
  const renderSymptoms = () => {
    return formData.symptoms.map((symptom, index) => (
      <div key={index}>
        <label>Symptom {index + 1}:</label>
        <input
          type="text"
          name={`symptom${index + 1}`}
          value={symptom}
          onChange={(e) => handleSymptomChange(index, e.target.value)}
        />
        {/* {formErrors.symptoms[index] && <span>{formErrors.symptoms[index]}</span>} */}
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
          value={formData.name}
          onChange={handleChange}
        />
        {formErrors.name && <span style={{ color: 'red' }}>{formErrors.name}</span>}
      </div>

      <div>
        <label>Age:</label>
        <input
          type="number"
          name="age"
          value={formData.age}
          onChange={handleChange}
        />
        {formErrors.age && <span>{formErrors.age}</span>}
      </div>

      <div>
        <label>Allergies:</label>
        <input
          type="text"
          name="allergies"
          value={formData.allergies}
          onChange={handleChange}
        />
        {formErrors.allergies && <span>{formErrors.allergies}</span>}
      </div>

      {renderSymptoms()}

      <button type="submit">Submit</button>
    </form>
  );
}

export default Form;