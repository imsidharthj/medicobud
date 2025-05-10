import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Autocomplete from '../data/autocomplete';
import { Thermometer, FileText, Calendar, Image } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  symptoms: z.array(z.string()),
  date: z.string().optional(),
  notes: z.string().optional(),
  images: z.array(z.instanceof(File)).optional()
});

interface FormValues {
  symptoms: string[];
  date?: string;
  notes?: string;
  images?: File[];
}

interface MedicalFormProps {
  handleFormSubmit: (data: any) => void;
  userProfile?: {
    name: string;
    age: string;
    gender: string;
    weight: number;
    allergies: string[];
  } | null;
  onClose?: () => void;
}

const NewMedicalForm: React.FC<MedicalFormProps> = ({ handleFormSubmit, userProfile, onClose }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [symptomFiles, setSymptomFiles] = useState<File[]>([]);

  const steps = [
    { id: 1, title: 'Symptoms', icon: <Thermometer />, description: 'Add your symptoms' },
    { id: 2, title: 'Summary', icon: <FileText />, description: 'Review your information' },
  ];

  const totalSteps = steps.length;
  const [completeSteps, setCompleteSteps] = useState<number[]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      symptoms: [],
      date: currentDate,
    },
  });

  useEffect(() => {
    if (selectedSymptoms.length > 0) {
      control._formValues.symptoms = selectedSymptoms;
    }
    control._formValues.date = currentDate;
  }, [selectedSymptoms, control, currentDate]);

  const nextStep = () => {
    if (currentStep < totalSteps) {
      if(!completeSteps.includes(currentStep)){
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

  const onSubmit = (data: FormValues) => {
    const submissionData = {
      date: data.date || format(new Date(), 'yyyy-MM-dd'),
      symptoms: selectedSymptoms,
      notes: data.notes || '',
      images: symptomFiles
    };
    
    handleFormSubmit(submissionData);
    
    if (onClose) {
      onClose();
    }
  };

  const removeSymptom = (symptom: string) => {
    setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSymptomFiles(prev => [...prev, file]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex items-center justify-center">
      <Card className="w-full max-w-5xl shadow-lg">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {/* Left Section - Form Wizard */}
            <div className="md:w-2/3 p-6 md:p-8">
              <div className="mb-2">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white mr-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold">Medical Form</h2>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold mt-10">
                  {steps[currentStep - 1].description}
                </h1>
              </div>

              <form onSubmit={handleSubmit(onSubmit)}>
                {/* Step 1: Symptoms */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="mb-6">
                      <Label
                        htmlFor="date"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Date of Symptoms
                      </Label>
                      <div className="relative">
                        <Calendar
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                          size={18}
                        />
                        <Input
                          type="date"
                          id="date"
                          value={currentDate}
                          onChange={(e) => setCurrentDate(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    {/* Add notes field */}
                    <div className="mb-6">
                      <Label
                        htmlFor="notes"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Notes (optional)
                      </Label>
                      <textarea
                        id="notes"
                        className="w-full p-2 border rounded-md"
                        rows={4}
                        onChange={(e) => {
                          control._formValues.notes = e.target.value;
                        }}
                        placeholder="Add any additional notes about your symptoms"
                      />
                    </div>
                    <Autocomplete
                      selectedSymptoms={selectedSymptoms}
                      onSymptomsChange={(updatedSymptoms) => {
                        setSelectedSymptoms(updatedSymptoms);
                      }}
                    />
                    {selectedSymptoms.length >= 3 && (
                      <div className="mt-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">
                          Selected symptoms:
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedSymptoms.map((symptom) => (
                            <div
                              key={symptom}
                              className="bg-blue-100 text-blue-800 rounded-full px-3 py-1 flex items-center"
                            >
                              <span>{symptom}</span>
                              <button
                                type="button"
                                onClick={() => removeSymptom(symptom)}
                                className="ml-2 text-blue-600 hover:text-blue-800"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        {/* Image upload section */}
                        <div className="mt-6 border-t pt-4">
                          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                            <Image size={18} className="mr-2" />
                            Upload symptom image (optional)
                          </h3>

                          <div className="space-y-4">
                            <div className="border rounded-md p-3">
                              {symptomFiles.length > 0 ? (
                                <div className="mt-2">
                                  <p>{symptomFiles.length} file(s) selected</p>
                                  <button
                                    type="button"
                                    onClick={() => setSymptomFiles([])}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    Remove image
                                  </button>
                                </div>
                              ) : (
                                <div className="mt-1">
                                  <Label
                                    htmlFor="symptom-image"
                                    className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                  >
                                    <Image size={16} className="mr-2" />
                                    Upload Image
                                  </Label>
                                  <Input
                                    id="symptom-image"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedSymptoms.length < 3 && (
                      <p className="text-sm text-red-500">
                        At least three symptoms are required
                      </p>
                    )}
                    {errors.symptoms && selectedSymptoms.length === 0 && (
                      <p className="text-sm text-red-500">
                        At least one symptom is required
                      </p>
                    )}
                  </div>
                )}

                {/* Step 2: Summary */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Your Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          {userProfile?.name && (
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">
                                Name
                              </h3>
                              <p>{userProfile.name}</p>
                            </div>
                          )}
                          {userProfile?.age && (
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">
                                Age
                              </h3>
                              <p>{userProfile.age} years old</p>
                            </div>
                          )}
                          {userProfile?.gender && (
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">
                                Gender
                              </h3>
                              <p>
                                {userProfile.gender.charAt(0).toUpperCase() +
                                  userProfile.gender.slice(1)}
                              </p>
                            </div>
                          )}
                          {userProfile?.weight && (
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">
                                Weight
                              </h3>
                              <p>{userProfile.weight} kg</p>
                            </div>
                          )}
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">
                              Symptoms
                            </h3>
                            <p>{selectedSymptoms.join(", ")}</p>
                          </div>
                          {userProfile?.allergies &&
                            userProfile.allergies.length > 0 && (
                              <div>
                                <h3 className="text-sm font-medium text-gray-500">
                                  Allergies
                                </h3>
                                <p>{userProfile.allergies.join(", ")}</p>
                              </div>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Navigation Controls */}
                <div className="mt-8 flex justify-between">
                  <Button
                    type="button"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    variant="blueButton"
                  >
                    Back
                  </Button>

                  {currentStep < totalSteps ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={
                        currentStep === 1 && selectedSymptoms.length < 3
                      }
                      variant="blueButton"
                    >
                      Next
                    </Button>
                  ) : (
                    // <Button type="submit" variant="blueButton">
                    //   Submit
                    // </Button>
                    <div onClick={() => handleSubmit(onSubmit)()} className='cursor-pointer'>Submit</div>
                  )}
                </div>
              </form>

              {/* Horizontal Step Indicator */}
              <div className="mt-0">
                <p className="text-gray-500 mt-5 mb-5">
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
                          : "bg-white text-blue-400"
                      }`}
                    >
                      {index + 1}
                    </div>
                  ))}
                </div>
                <div className="relative h-1 bg-white">
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

            {/* Right Section - Profile Summary */}
            <div className="lg:w-1/3 lg:min-w-[250px] lg:max-w-[350px] bg-blue-500 text-white p-6 md:p-8">
              <div className="space-y-6">
                <h3 className="text-xl font-semibold mb-4">Your Profile</h3>
                <div className="space-y-4">
                  {currentDate && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Date of Symptoms
                      </h3>
                      <p>{currentDate}</p>
                    </div>
                  )}

                  {selectedSymptoms.length > 0 && (
                    <div className="bg-blue-400 rounded-lg p-4">
                      <h4 className="font-medium mb-1">Symptoms</h4>
                      <p className="text-blue-100 break-words">
                        {selectedSymptoms.join(", ")}
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
};

export default NewMedicalForm;