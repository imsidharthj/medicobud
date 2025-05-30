import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useForm, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, VenusAndMars, Weight, NutOff, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FASTAPI_URL } from '@/utils/api';

interface ProfileCompletionModalProps {
  email: string;
  missingFields: string[];
  onComplete: () => void;
}

// Define step interface to fix type issues
interface Step {
  id: number;
  title: string;
  icon: React.ReactNode;
  description: string;
  field: string | null; // Allow both string and null
}

function ProfileCompletionModal({ email, missingFields, onComplete }: ProfileCompletionModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({ email });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [completeSteps, setCompleteSteps] = useState<number[]>([]);
  
  // Date of birth separate state for dropdowns
  const [dobDay, setDobDay] = useState<string>('');
  const [dobMonth, setDobMonth] = useState<string>('');
  const [dobYear, setDobYear] = useState<string>('');
  
  // Helper function to calculate age from a date string (YYYY-MM-DD)
  const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    // Adjust age if birthday hasn't occurred yet this year
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  // Generate months array
  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  // Generate years array (from current year back to 120 years ago)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 120 }, (_, i) => currentYear - i);

  // Update formData when date components change
  useEffect(() => {
    if (dobDay && dobMonth && dobYear) {
      const formattedDate = `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`;
      setFormData(prev => ({
        ...prev,
        date_of_birth: formattedDate
      }));
    }
  }, [dobDay, dobMonth, dobYear]);
  
  // Form setup with react-hook-form and improved validation
  const { control, formState: { errors }, trigger } = useForm({
    defaultValues: {
      date_of_birth: '',
      gender: '',
      weight: '',
      allergies: [] as string[]
    },
  });
  
  // Filter unique missing fields and add email
  const fieldsToComplete = [...new Set(missingFields.filter(field => field !== 'email'))];
  
  // Generate steps based on missing fields with proper typing
  const steps: Step[] = [
    { id: 1, title: 'Welcome', icon: <Calendar />, description: 'Complete Your Profile', field: null },
  ];
  
  // Add steps based on missing fields
  fieldsToComplete.forEach((field, index) => {
    const stepId = index + 2; // Start at 2 because welcome is step 1
    let icon = <FileText />;
    let title = formatFieldName(field);
    
    switch(field) {
      case 'date_of_birth':
        icon = <Calendar />;
        title = 'Date of Birth';
        break;
      case 'gender':
        icon = <VenusAndMars />;
        title = 'Gender';
        break;
      case 'weight':
        icon = <Weight />;
        title = 'Weight';
        break;
      case 'allergies':
        icon = <NutOff />;
        title = 'Allergies';
        break;
    }
    
    steps.push({ 
      id: stepId, 
      title, 
      icon, 
      description: `What is your ${title.toLowerCase()}?`,
      field
    });
  });
  
  // Add summary step as the last step
  steps.push({ 
    id: steps.length + 1, 
    title: 'Summary', 
    icon: <FileText />, 
    description: 'Review your information',
    field: null
  });
  
  const totalSteps = steps.length;
  
  const nextStep = async () => {
    // Validate current step before proceeding
    const currentStepData = steps[currentStep - 1];
    if (currentStepData.field) {
      const isValid = await trigger(currentStepData.field as any);
      if (!isValid) return;
    }
    
    if (currentStep < totalSteps) {
      if (!completeSteps.includes(currentStep)) {
        setCompleteSteps([...completeSteps, currentStep]);
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  function handleInputChange(field: string, value: any) {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }
  
  // Process allergies from string to array if needed
  const prepareDataForSubmission = () => {
    const preparedData = { ...formData };
    
    // Convert allergies from string to array if it's a string
    if (typeof preparedData.allergies === 'string') {
      preparedData.allergies = preparedData.allergies
        .split(',')
        .map((item: string) => item.trim())
        .filter((item: string) => item);
    }
    
    // Ensure weight is a number
    if (preparedData.weight) {
      preparedData.weight = Number(preparedData.weight);
    }
    
    return preparedData;
  };
  
  async function handleSubmit() {
    // Validate all fields before submission
    const allFieldsValid = await trigger();
    if (!allFieldsValid) {
      setError("Please complete all required fields");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const dataToSubmit = prepareDataForSubmission();
      
      const response = await fetch(`${FASTAPI_URL}/api/auth/complete-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit)
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.profile_complete) {
        onComplete();
      } else {
        setError(`Some required fields are still missing: ${data.missing_fields.join(', ')}. Please complete the form.`);
        // Go back to the first missing field
        const firstMissingField = data.missing_fields[0];
        const stepIndex = steps.findIndex(step => step.field === firstMissingField);
        if (stepIndex > 0) {
          setCurrentStep(stepIndex);
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }
  
  // Check if the current step can proceed
  const canProceed = () => {
    const currentStepData = steps[currentStep - 1];
    if (!currentStepData.field) return true; // Welcome or summary step
    
    const fieldValue = formData[currentStepData.field];
    
    switch (currentStepData.field) {
      case 'date_of_birth':
        return !!fieldValue;
      case 'gender':
        return !!fieldValue;
      case 'weight':
        const weight = Number(fieldValue);
        return !!fieldValue && weight >= 20 && weight <= 150;
      case 'allergies':
        // Allergies can be optional
        return true;
      default:
        return !!fieldValue;
    }
  };
  
  const commonAllergies = ['Peanuts', 'Dairy', 'Gluten', 'Shellfish', 'Pollen', 'Medication'];
  
  // Initialize allergies as an array if present in missingFields
  useEffect(() => {
    if (missingFields.includes('allergies') && !formData.allergies) {
      setFormData(prev => ({
        ...prev,
        allergies: []
      }));
    }
  }, [missingFields]);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-5xl shadow-lg">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {/* Left Section - Form Wizard */}
            <div className="md:w-2/3 p-6 md:p-8">
              <div className="mb-2">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white mr-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold">Complete Your Profile</h2>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold mt-6">
                  {steps[currentStep - 1].description}
                </h1>
              </div>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              <div className="mt-6">
                {/* Step 1: Welcome */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <p className="mb-4">
                      Please provide the following information to continue using
                      the application:
                    </p>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h3 className="font-medium text-blue-800 mb-2">
                        Your Email:
                      </h3>
                      <p className="text-gray-700">{email}</p>
                    </div>

                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h3 className="font-medium text-yellow-800 mb-2">
                        Missing Information:
                      </h3>
                      <ul className="list-disc pl-5 text-gray-700">
                        {fieldsToComplete.map((field) => (
                          <li key={field}>{formatFieldName(field)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Date of Birth Step */}
                {currentStep > 1 &&
                  steps[currentStep - 1].field === "date_of_birth" && (
                    <div className="space-y-4">
                      <Label className="text-sm text-gray-400 block mb-1">
                        Select your date of birth
                      </Label>
                      
                      <div className="grid grid-cols-3 gap-4">
                        {/* Day Dropdown */}
                        <div>
                          <Select
                            onValueChange={(value) => {
                              setDobDay(value);
                              handleInputChange("date_of_birth", `${dobYear}-${dobMonth}-${value}`);
                            }}
                            value={dobDay}
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Day" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                <SelectItem key={day} value={String(day)}>
                                  {String(day).padStart(2, '0')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Month Dropdown */}
                        <div>
                          <Select
                            onValueChange={(value) => {
                              setDobMonth(value);
                              handleInputChange("date_of_birth", `${dobYear}-${value}-${dobDay}`);
                            }}
                            value={dobMonth}
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                              {months.map(month => (
                                <SelectItem key={month.value} value={month.value}>
                                  {month.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Year Dropdown */}
                        <div>
                          <Select
                            onValueChange={(value) => {
                              setDobYear(value);
                              handleInputChange("date_of_birth", `${value}-${dobMonth}-${dobDay}`);
                            }}
                            value={dobYear}
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                              {years.map(year => (
                                <SelectItem key={year} value={String(year)}>
                                  {String(year)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {errors.date_of_birth && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.date_of_birth.message as string}
                        </p>
                      )}
                      {formData.date_of_birth && (
                        <div className="mt-2 text-sm text-gray-600">
                          Age: {calculateAge(formData.date_of_birth)} years
                        </div>
                      )}
                    </div>
                  )}

                {/* Gender Step */}
                {currentStep > 1 && steps[currentStep - 1].field === "gender" && (
                  <div className="space-y-4">
                    <Controller
                      name="gender"
                      control={control}
                      rules={{ required: "Please select a gender" }}
                      render={({ field }) => (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div
                              className={`border rounded-lg p-6 flex flex-col items-center cursor-pointer transition-all hover:border-blue-500 ${field.value === 'female' ? 'border-blue-500 bg-blue-50' : ''}`}
                              onClick={() => {
                                field.onChange('female');
                                handleInputChange("gender", 'female');
                              }}
                            >
                              <div className="w-12 h-12 text-blue-500 mb-4">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                  <circle cx="12" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
                                  <path d="M12 15V21" stroke="currentColor" strokeWidth="2" />
                                  <path d="M9 18H15" stroke="currentColor" strokeWidth="2" />
                                </svg>
                              </div>
                              <p className="text-lg font-medium">Female</p>
                            </div>

                            <div
                              className={`border rounded-lg p-6 flex flex-col items-center cursor-pointer transition-all hover:border-blue-500 ${field.value === 'male' ? 'border-blue-500 bg-blue-50' : ''}`}
                              onClick={() => {
                                field.onChange('male');
                                handleInputChange("gender", 'male');
                              }}
                            >
                              <div className="w-12 h-12 text-blue-500 mb-4">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                  <circle cx="10" cy="14" r="5" stroke="currentColor" strokeWidth="2" />
                                  <path d="M14 10L19 5" stroke="currentColor" strokeWidth="2" />
                                  <path d="M15 5H19V9" stroke="currentColor" strokeWidth="2" />
                                </svg>
                              </div>
                              <p className="text-lg font-medium">Male</p>
                            </div>
                          </div>
                          {errors.gender && (
                            <p className="text-sm text-red-500 mt-1">
                              {errors.gender.message as string}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>
                )}

                {/* Weight Step */}
                {currentStep > 1 && steps[currentStep - 1].field === "weight" && (
                  <div className="space-y-4">
                    <Label htmlFor="weight" className="text-base text-gray-400">Weight (kg)</Label>
                    <Controller
                      name="weight"
                      control={control}
                      rules={{ 
                        required: "Weight is required", 
                        min: { value: 20, message: "Weight must be at least 20kg" },
                        max: { value: 150, message: "Weight must be at most 150kg" }
                      }}
                      render={({ field }) => (
                        <div className="relative">
                          <Input
                            id="weight"
                            type="number"
                            className={`h-12 mt-3 max-w-60 ${errors.weight ? 'border-red-500' : ''}`}
                            placeholder="Enter your weight"
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value);
                              handleInputChange("weight", value);
                            }}
                            value={field.value}
                          />
                          <div className="absolute right-3 top-3 text-gray-500">
                            kg
                          </div>
                          {errors.weight && (
                            <p className="text-sm text-red-500 mt-1">
                              {errors.weight.message as string}
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </div>
                )}

                {/* Allergies Step */}
                {currentStep > 1 &&
                  steps[currentStep - 1].field === "allergies" && (
                    <div className="space-y-6">
                      <p className="text-gray-600 mb-2">
                        Select any allergies you have:
                      </p>
                      <Controller
                        name="allergies"
                        control={control}
                        render={({ field }) => (
                          <div className="grid grid-cols-2 gap-4">
                            {commonAllergies.map((allergy) => (
                              <div key={allergy} className="flex items-center space-x-2">
                                <Checkbox
                                  id={allergy}
                                  checked={Array.isArray(field.value) && (field.value as string[]).includes(allergy)}
                                  onCheckedChange={(checked) => {
                                    const currentAllergies = Array.isArray(field.value) ? field.value : [];
                                    const updatedAllergies = checked
                                      ? [...currentAllergies, allergy]
                                      : currentAllergies.filter((a: string) => a !== allergy);
                                    field.onChange(updatedAllergies);
                                    handleInputChange("allergies", updatedAllergies);
                                  }}
                                />
                                <label htmlFor={allergy} className="text-sm font-medium leading-none">
                                  {allergy}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      />
                    </div>
                  )}

                {/* Summary Step */}
                {currentStep === totalSteps && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Your Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">
                              Email
                            </h4>
                            <p className="mt-1">{email}</p>
                          </div>

                          {fieldsToComplete.includes("date_of_birth") && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-500">
                                Date of Birth
                              </h4>
                              <p className="mt-1">
                                {formData.date_of_birth || "Not provided"}
                              </p>
                              {formData.date_of_birth && (
                                <p className="text-sm text-gray-500">
                                  Age: {calculateAge(formData.date_of_birth)} years
                                </p>
                              )}
                            </div>
                          )}

                          {fieldsToComplete.includes("gender") && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-500">
                                Gender
                              </h4>
                              <p className="mt-1">
                                {formData.gender
                                  ? formData.gender.charAt(0).toUpperCase() +
                                    formData.gender.slice(1)
                                  : "Not provided"}
                              </p>
                            </div>
                          )}

                          {fieldsToComplete.includes("weight") && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-500">
                                Weight
                              </h4>
                              <p className="mt-1">
                                {formData.weight
                                  ? `${formData.weight} kg`
                                  : "Not provided"}
                              </p>
                            </div>
                          )}

                          {fieldsToComplete.includes("allergies") && 
                           Array.isArray(formData.allergies) && 
                           formData.allergies.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-500">
                                Allergies
                              </h4>
                              <p className="mt-1">
                                {formData.allergies.join(", ")}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* Navigation Controls */}
              <div className="mt-8 flex justify-between">
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    onClick={prevStep}
                    variant="blueButton"
                  >
                    Back
                  </Button>
                ) : (
                  <div></div>
                )}

                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={!canProceed()}
                    variant="blueButton"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    variant="blueButton"
                  >
                    {isSubmitting ? "Submitting..." : "Complete Profile"}
                  </Button>
                )}
              </div>

              {/* Horizontal Step Indicator */}
              <div className="mt-8">
                <p className="text-gray-500 mb-5">
                  Step {currentStep} of {totalSteps}
                </p>

                <div className="flex justify-between mb-1">
                  {steps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        completeSteps.includes(step.id)
                          ? "bg-blue-500 text-white"
                          : currentStep === step.id
                          ? "bg-blue-200 text-blue-800"
                          : "bg-white text-blue-400 border border-gray-200"
                      }`}
                    >
                      {index + 1}
                    </div>
                  ))}
                </div>
                <div className="relative h-1 bg-gray-200">
                  <div
                    className="absolute h-1 bg-blue-400 transition-all duration-300"
                    style={{
                      width: `${
                        (completeSteps.length / (totalSteps - 1)) * 100
                      }%`,
                    }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1">
                  {steps.map((step) => (
                    <div key={step.id} className="w-8 text-center text-xs">
                      <span className="">{step.icon}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Section - Progress & Summary */}
            <div className="hidden md:block md:w-1/3 bg-blue-500 text-white p-6 md:p-8">
              <div className="space-y-6">
                <h3 className="text-xl font-semibold mb-4">Profile Summary</h3>

                <div className="space-y-4">
                  <div className="bg-blue-400 rounded-lg p-4">
                    <h4 className="font-medium mb-1">Email</h4>
                    <p className="text-blue-100">{email}</p>
                  </div>

                  {formData.date_of_birth && (
                    <div className="bg-blue-400 rounded-lg p-4">
                      <h4 className="font-medium mb-1">Date of Birth</h4>
                      <p className="text-blue-100">{formData.date_of_birth}</p>
                      <p className="text-blue-100 text-sm mt-1">
                        Age: {calculateAge(formData.date_of_birth)} years
                      </p>
                    </div>
                  )}

                  {formData.gender && (
                    <div className="bg-blue-400 rounded-lg p-4">
                      <h4 className="font-medium mb-1">Gender</h4>
                      <p className="text-blue-100">
                        {formData.gender.charAt(0).toUpperCase() +
                          formData.gender.slice(1)}
                      </p>
                    </div>
                  )}

                  {formData.weight && (
                    <div className="bg-blue-400 rounded-lg p-4">
                      <h4 className="font-medium mb-1">Weight</h4>
                      <p className="text-blue-100">{formData.weight} kg</p>
                    </div>
                  )}

                  {Array.isArray(formData.allergies) && formData.allergies.length > 0 && (
                    <div className="bg-blue-400 rounded-lg p-4">
                      <h4 className="font-medium mb-1">Allergies</h4>
                      <p className="text-blue-100 break-words">
                        {formData.allergies.join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to format field names
function formatFieldName(field: string): string {
  return field.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export default ProfileCompletionModal;