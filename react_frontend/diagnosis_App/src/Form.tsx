import React from 'react';

interface FormProps {
  name: string;
  age: string;
  allergies: string;
  symptoms: string[];
  formErrors: {
    name: string;
    age: string;
    symptoms: string[];
    allergies: string;
  };
  setName: (value: string) => void;
  setAge: (value: string) => void;
  setAllergies: (value: string) => void;
  setSymptoms: (value: string[]) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

function Form({
  name,
  age,
  allergies,
  symptoms,
  formErrors,
  setName,
  setAge,
  setAllergies,
  setSymptoms,
  handleSubmit,
}: FormProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'name') {
      setName(value);
    } else if (name === 'age') {
      setAge(value ? String(parseInt(value, 10)) : "");
    } else if (name === 'allergies') {
      setAllergies(value); // Dummy field
    }
  };

  const handleSymptomChange = (index: number, value: string) => {
    const updatedSymptoms = [...symptoms];
    updatedSymptoms[index] = value;
    setSymptoms(updatedSymptoms);
  };

  // Render symptoms dynamically
  const renderSymptoms = () => {
    return symptoms.map((symptom, index) => (
      <div key={index}>
        <label>Symptom {index + 1}:</label>
        <input
          type="text"
          value={symptom}
          onChange={(e) => handleSymptomChange(index, e.target.value)}
        />
        {formErrors.symptoms[index] && (
          <span style={{ color: 'red' }}>{formErrors.symptoms[index]}</span>
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