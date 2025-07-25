import React, { useState, useEffect, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, X, Search } from "lucide-react";
import uniqueSymptoms from "../../data/autocomplete-symptoms";

const COMMON_SYMPTOMS = [
  "Headache",
  "Fever",
  "Cough",
  "Sore throat",
  "Runny nose",
  "Body aches",
  "Fatigue",
  "Nausea",
  "Vomiting",
  "Diarrhea",
  "Shortness of breath",
  "Chills",
];

interface DiagnosisSymptomInputProps {
  enteredSymptoms: string[];
  onAddSymptom: (symptom: string) => void;
  onRemoveSymptom: (symptom: string) => void;
  onSubmit: () => void;
}

const DiagnosisSymptomInput: React.FC<DiagnosisSymptomInputProps> = ({
  enteredSymptoms,
  onAddSymptom,
  onRemoveSymptom,
  onSubmit,
}) => {
  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(false);
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

    const filtered = uniqueSymptoms.filter(
      (symptom) =>
        symptom.toLowerCase().includes(inputValue.toLowerCase()) &&
        !enteredSymptoms.includes(symptom)
    );

    setFilteredSuggestions(filtered);
    setActiveSuggestionIndex(0);
    setShowSuggestions(filtered.length > 0);
  }, [inputValue, enteredSymptoms]);

  const handleChipClick = (symptom: string) => {
    if (!enteredSymptoms.includes(symptom)) {
      onAddSymptom(symptom);
    } else {
      onRemoveSymptom(symptom);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === "ArrowDown" &&
      showSuggestions &&
      filteredSuggestions.length > 0
    ) {
      e.preventDefault();
      setActiveSuggestionIndex((prevIndex) =>
        prevIndex === filteredSuggestions.length - 1 ? 0 : prevIndex + 1
      );
    } else if (
      e.key === "ArrowUp" &&
      showSuggestions &&
      filteredSuggestions.length > 0
    ) {
      e.preventDefault();
      setActiveSuggestionIndex((prevIndex) =>
        prevIndex === 0 ? filteredSuggestions.length - 1 : prevIndex - 1
      );
    } else if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (
        showSuggestions &&
        filteredSuggestions.length > 0 &&
        activeSuggestionIndex >= 0
      ) {
        selectSymptom(filteredSuggestions[activeSuggestionIndex]);
      } else {
        // Allow free text entry when no suggestions or user types custom symptom
        selectSymptom(inputValue.trim());
      }
    }
  };

  const selectSymptom = (symptom: string) => {
    const trimmed = symptom.trim();
    if (!trimmed || enteredSymptoms.includes(trimmed)) return;

    onAddSymptom(trimmed);
    setInputValue("");
    setShowSuggestions(false);
    setFilteredSuggestions([]);
  };

  const handleAddSymptom = () => {
    if (inputValue.trim()) {
      selectSymptom(inputValue.trim());
    }
  };

  const handleSubmit = () => {
    if (enteredSymptoms.length === 0) {
      return;
    }

    if (enteredSymptoms.length < 3 && !showDisclaimer) {
      setShowDisclaimer(true);
      return;
    }

    onSubmit();
  };

  return (
    <div className="mt-4 max-w-[80%]">
      <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
        {/* Display entered symptoms as pills */}
        {enteredSymptoms.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Your entered symptoms:
            </p>
            <div className="flex flex-wrap gap-2">
              {enteredSymptoms.map((symptom) => (
                <div
                  key={symptom}
                  className="flex items-center bg-blue-100 text-blue-800 text-xs font-semibold pl-3 pr-2 py-1 rounded-full"
                >
                  {symptom}
                  <button
                    onClick={() => onRemoveSymptom(symptom)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Autocomplete input */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Type or search for symptoms:
          </p>
          <div className="relative">
            <Search className="absolute top-3 left-3 text-gray-400 w-4 h-4" />
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg p-2 pl-10 focus:border-blue-500 focus:outline-none"
              placeholder="Type a symptom (e.g., headache, fever)..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button
              onClick={handleAddSymptom}
              disabled={!inputValue.trim()}
              className="absolute right-1 top-1 h-8 px-3 text-xs"
              variant="blueButton"
            >
              Add
            </Button>

            {showSuggestions && filteredSuggestions.length > 0 && (
              <ul className="absolute left-0 right-0 bg-white border border-gray-300 shadow-lg max-h-40 overflow-y-auto z-10 rounded-lg mt-1">
                {filteredSuggestions.map((symptom, index) => (
                  <li
                    key={symptom}
                    className={`p-2 cursor-pointer hover:bg-gray-100 text-sm ${
                      index === activeSuggestionIndex
                        ? "bg-blue-50 text-blue-700"
                        : ""
                    }`}
                    onClick={() => selectSymptom(symptom)}
                  >
                    {symptom}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Common symptom chips */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Or select common symptoms:
          </p>
          <div className="flex flex-wrap gap-2">
            {COMMON_SYMPTOMS.map((symptom) => (
              <div
                key={symptom}
                onClick={() => handleChipClick(symptom)}
                className={`cursor-pointer flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  enteredSymptoms.includes(symptom)
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {enteredSymptoms.includes(symptom) && (
                  <CheckCircle className="w-3 h-3 mr-1.5" />
                )}
                {symptom}
              </div>
            ))}
          </div>
        </div>

        {showDisclaimer && (
          <Alert
            variant="default"
            className="bg-yellow-50 border-yellow-300 text-yellow-800"
          >
            <AlertCircle className="h-4 w-4 !text-yellow-800" />
            <AlertDescription className="text-xs">
              For a more accurate analysis, please try to provide at least three
              symptoms if possible.
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleSubmit}
          disabled={enteredSymptoms.length === 0}
          className="w-full h-9 text-sm"
          variant="blueButton"
        >
          {showDisclaimer
            ? `Submit ${enteredSymptoms.length} Symptom(s) Anyway`
            : `Submit Symptoms`}
        </Button>
      </div>
    </div>
  );
};

export default DiagnosisSymptomInput;
