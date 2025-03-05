import React, { useState, useEffect, KeyboardEvent } from "react";
import uniqueSymptoms from "./autocomplete-symptoms";

interface AutocompleteProps {
  selectedSymptoms: string[];
  onSymptomsChange: (symptoms: string[]) => void;
}

const Autocomplete: React.FC<AutocompleteProps> = ({
  selectedSymptoms,
  onSymptomsChange,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = uniqueSymptoms.filter((symptom) =>
      symptom.toLowerCase().includes(inputValue.toLowerCase())
    );

    setFilteredSuggestions(filtered);
    setActiveSuggestionIndex(0);
    setShowSuggestions(true);
  }, [inputValue]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((prevIndex) =>
        prevIndex === filteredSuggestions.length - 1 ? 0 : prevIndex + 1
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((prevIndex) =>
        prevIndex === 0 ? filteredSuggestions.length - 1 : prevIndex - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectSymptom(filteredSuggestions[activeSuggestionIndex]);
    }
  };

  const selectSymptom = (symptom: string) => {
    if (!selectedSymptoms.includes(symptom)) {
      const updatedSymptoms = [...selectedSymptoms, symptom];
      onSymptomsChange(updatedSymptoms);
    }
    setInputValue("");
    setShowSuggestions(false);
    setFilteredSuggestions([]);
  };

  const removeSymptom = (index: number) => {
    const updatedSymptoms = selectedSymptoms.filter((_, i) => i !== index);
    onSymptomsChange(updatedSymptoms);
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="relative">
        <input
          type="text"
          className="w-full border border-gray-300 rounded p-2"
          placeholder="Enter a symptom..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {showSuggestions && filteredSuggestions.length > 0 && (
          <ul className="absolute left-0 right-0 bg-white border border-gray-300 shadow-md max-h-40 overflow-y-auto z-10 rounded">
            {filteredSuggestions.map((symptom, index) => (
              <li
                key={symptom}
                className={`p-2 cursor-pointer hover:bg-gray-100 ${
                  index === activeSuggestionIndex ? "bg-gray-200" : ""
                }`}
                onClick={() => selectSymptom(symptom)}
              >
                {symptom}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        {selectedSymptoms.map((symptom, index) => (
          <div
            key={`${symptom}-${index}`}
            className="bg-blue-500 text-white px-3 py-1 rounded-full flex items-center gap-2"
          >
            <span>{symptom}</span>
            <button
              type="button"
              className="bg-transparent hover:bg-blue-600 rounded-full px-1"
              onClick={() => removeSymptom(index)}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Autocomplete;