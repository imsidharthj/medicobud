import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Autocomplete from '../data/autocomplete';
import { title } from 'process';
import { icons } from 'lucide-react';

// Zod schema for form validation
const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  age: z.string().min(1, {
    message: 'Age is required.',
  }).refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num >= 18 && num <= 130;
  }, { message: 'Age must be between 18 and 130.' }),
  gender: z.string().min(1, { message: 'Gender is required' }),
  weight: z.number().min(0, {
    message: 'Weight must be a positive number.',
  }),
  forSelf: z.boolean().default(true),
  allergies: z.array(z.string()).optional().default([]),
  symptoms: z.array(z.string()).min(1, {
    message: 'At least one symptom is required.',
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface MedicalFormProps {
  handleFormSubmit: (data: FormValues) => void;
}

const MedicalForm: React.FC<MedicalFormProps> = ({ handleFormSubmit }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const { control, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      age: '',
      gender: '',
      weight: 70,
      forSelf: true,
      allergies: [],
      symptoms: [],
    },
    mode: 'onChange'
  });

  const steps = [
    // { id: 1, title: 'Who', icon: 'user', description: 'Who is the survey for?' },
    { id: 1, title: 'Name', icon: 'user', description: 'What is your name' },
    { id: 2, title: 'Age', icon: 'calendar', description: 'How old are you?' },
    { id: 3, title: 'Gender', icon: 'gender', description: 'What sex was originally listed on your birth certificate?' },
    { id: 4, title: 'Symptoms', icon: 'symptoms', description: 'Add your symptoms' },
    { id: 5, title: 'Allergies', icon: 'allergies', description: 'Do you have any allergies?' },
    { id: 6, title: 'Summary', icon: 'summary', description: 'Review your information' },
    // { id: 7, title: 'weight', icon: 'weight', description: 'What is your weight?' }
  ];

  const totalSteps = steps.length;
  
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = (data: FormValues) => {
    console.log('Form submitted:', data);
    handleFormSubmit(data);
    alert('Form submitted successfully!');
  };

  const formData = watch();

  const commonAllergies = ['Peanuts', 'Dairy', 'Gluten', 'Shellfish', 'Pollen', 'Medication'];

  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  useEffect(() => {
    if (selectedSymptoms.length > 0) {
      control._formValues.symptoms = selectedSymptoms;
    }
  }, [selectedSymptoms, control]);

  const removeSymptom = (symptom: string) => {
    setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex items-center justify-center">
      <Card className="w-full max-w-4xl shadow-lg">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {/* Left Section - Form Wizard */}
            <div className="md:w-2/3 p-6 md:p-8">
              <div className="mb-8">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white mr-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold">Medical Form</h2>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold mt-4">{steps[currentStep-1].description}</h1>
                <p className="text-gray-500 mt-2">
                  Step {currentStep} of {totalSteps}
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)}>
                {/* Step 1: Who is the survey for */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <Controller
                      name="forSelf"
                      control={control}
                      render={({ field }) => (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div 
                            className={`border rounded-lg p-6 flex flex-col items-center cursor-pointer transition-all hover:border-blue-500 ${field.value ? 'border-blue-500 bg-blue-50' : ''}`}
                            onClick={() => field.onChange(true)}
                          >
                            <div className="w-16 h-16 text-blue-500 mb-4">
                              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2"/>
                                <path d="M6 21V19C6 16.7909 7.79086 15 10 15H14C16.2091 15 18 16.7909 18 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                            </div>
                            <p className="text-lg font-medium">Myself</p>
                          </div>
                          
                          <div 
                            className={`border rounded-lg p-6 flex flex-col items-center cursor-pointer transition-all hover:border-blue-500 ${!field.value ? 'border-blue-500 bg-blue-50' : ''}`}
                            onClick={() => field.onChange(false)}
                          >
                            <div className="w-16 h-16 text-blue-500 mb-4">
                              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2"/>
                                <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="currentColor" strokeWidth="2"/>
                                <path d="M19 8C21.2091 8 23 6.20914 23 4C23 1.79086 21.2091 0 19 0C16.7909 0 15 1.79086 15 4C15 6.20914 16.7909 8 19 8Z" stroke="currentColor" strokeWidth="1.5"/>
                              </svg>
                            </div>
                            <p className="text-lg font-medium">Someone else</p>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="space-y-4">
                    <Controller
                      name="name"  // Changed from "forSelf" to "name"
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            {...field}
                            id="name"
                            type="text"
                            className="h-12"
                            placeholder="Enter your full name"
                          />
                          {errors.name && (
                            <p className="text-sm text-red-500">{errors.name.message}</p>
                          )}
                        </div>
                      )}
                    />
                  </div>
                )}

                {/* Step 2: Age */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <Label htmlFor="age" className="text-base">Type your age. Age must be between 18 and 130.</Label>
                    <Controller
                      name="age"
                      control={control}
                      render={({ field }) => (
                        <div className="relative">
                          <Input
                            {...field}
                            id="age"
                            type="number"
                            className="h-12 pr-16 text-right text-lg"
                            placeholder="Enter your age"
                          />
                          <div className="absolute right-3 top-3 text-gray-500">
                            years old
                          </div>
                        </div>
                      )}
                    />
                    {errors.age && <p className="text-sm text-red-500">{errors.age.message}</p>}
                  </div>
                )}

                {/* Step 3: Gender */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <Controller
                      name="gender"
                      control={control}
                      render={({ field }) => (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div 
                            className={`border rounded-lg p-6 flex flex-col items-center cursor-pointer transition-all hover:border-blue-500 ${field.value === 'female' ? 'border-blue-500 bg-blue-50' : ''}`}
                            onClick={() => field.onChange('female')}
                          >
                            <div className="w-12 h-12 text-blue-500 mb-4">
                              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                <circle cx="12" cy="9" r="6" stroke="currentColor" strokeWidth="2"/>
                                <path d="M12 15V21" stroke="currentColor" strokeWidth="2"/>
                                <path d="M9 18H15" stroke="currentColor" strokeWidth="2"/>
                              </svg>
                            </div>
                            <p className="text-lg font-medium">Female</p>
                          </div>
                          
                          <div 
                            className={`border rounded-lg p-6 flex flex-col items-center cursor-pointer transition-all hover:border-blue-500 ${field.value === 'male' ? 'border-blue-500 bg-blue-50' : ''}`}
                            onClick={() => field.onChange('male')}
                          >
                            <div className="w-12 h-12 text-blue-500 mb-4">
                              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                <circle cx="12" cy="14" r="6" stroke="currentColor" strokeWidth="2"/>
                                <path d="M16 10L20 6" stroke="currentColor" strokeWidth="2"/>
                                <path d="M17 9H20V6" stroke="currentColor" strokeWidth="2"/>
                              </svg>
                            </div>
                            <p className="text-lg font-medium">Male</p>
                          </div>
                        </div>
                      )}
                    />
                    {errors.gender && <p className="text-sm text-red-500">{errors.gender.message}</p>}
                  </div>
                )}

                {/* Step 4: Symptoms */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <Autocomplete
                      selectedSymptoms={selectedSymptoms}
                      onSymptomsChange={(updatedSymptoms) => {
                        setSelectedSymptoms(updatedSymptoms);
                      }}
                    />
                    {selectedSymptoms.length >= 3 && (
                      <div className="mt-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Selected symptoms:</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedSymptoms.map(symptom => (
                            <div key={symptom} className="bg-blue-100 text-blue-800 rounded-full px-3 py-1 flex items-center">
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
                      </div>
                    )}
                    {errors.symptoms && selectedSymptoms.length === 0 && (
                      <p className="text-sm text-red-500">At least one symptom is required</p>
                    )}
                  </div>
                )}

                {/* Step 5: Allergies */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <Controller
                      name="allergies"
                      control={control}
                      render={({ field }) => (
                        <div className="grid grid-cols-2 gap-4">
                          {commonAllergies.map((allergy) => (
                            <div key={allergy} className="flex items-center space-x-2">
                              <Checkbox
                                id={allergy}
                                checked={field.value.includes(allergy)}
                                onCheckedChange={(checked) => {
                                  const updatedAllergies = checked
                                    ? [...field.value, allergy]
                                    : field.value.filter((a: string) => a !== allergy);
                                  field.onChange(updatedAllergies);
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
                    <p className="text-sm text-gray-500">Allergies are optional</p>
                  </div>
                )}

                {/* Step 6: Summary */}
                {currentStep === 6 && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Your Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">For</h3>
                            <p>{formData.name ? 'Myself' : 'Someone else'}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Age</h3>
                            <p>{formData.age} years old</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Gender</h3>
                            <p>{formData.gender ? formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1) : '-'}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Symptoms</h3>
                            <p>{selectedSymptoms.join(', ')}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">Allergies</h3>
                            <p>{formData.allergies.length > 0 ? formData.allergies.join(', ') : 'None'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Navigation Controls */}
                <div className="mt-8 flex justify-between">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={prevStep}
                    disabled={currentStep === 1}
                  >
                    Back
                  </Button>
                  
                  {currentStep < totalSteps ? (
                    <Button 
                      type="button" 
                      onClick={nextStep}
                      disabled={
                        (currentStep === 2 && !formData.age) ||
                        (currentStep === 3 && !formData.gender) ||
                        (currentStep === 4 && selectedSymptoms.length === 0)
                      }
                    >
                      Next
                    </Button>
                  ) : (
                    <Button type="submit">Submit</Button>
                  )}
                </div>
              </form>

              <h2 className="text-2xl font-bold mb-6 mt-6">Your Progress</h2>
              {/* Horizontal Step Indicator */}
              <div className="mt-10">
                <div className="flex justify-between mb-1">
                  {steps.map((step, index) => (
                    <div 
                      key={step.id} 
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        currentStep >= step.id ? 'bg-white text-blue-500' : 'bg-blue-400 text-white'
                      }`}
                    >
                      {index + 1}
                    </div>
                  ))}
                </div>
                <div className="relative h-1 bg-blue-400">
                  <div 
                    className="absolute h-1 bg-white transition-all duration-300" 
                    style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1">
                  {steps.map((step) => (
                    <div key={step.id} className="w-8 text-center text-xs">
                      {step.title}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Section - Progress & Summary */}
            <div className="md:w-1/3 bg-blue-500 text-white p-6 md:p-8">
              
              <div className="mt-8">
                <h3 className="text-xl font-semibold mb-4">Form Summary</h3>
                
                <div className="space-y-4">
                  <div className="bg-blue-400 rounded-lg p-4">
                    <h4 className="font-medium mb-1">For</h4>
                    <p className="text-blue-100">{formData.name ? 'Myself' : 'Someone else'}</p>
                  </div>
                  
                  {formData.age && (
                    <div className="bg-blue-400 rounded-lg p-4">
                      <h4 className="font-medium mb-1">Age</h4>
                      <p className="text-blue-100">{formData.age} years old</p>
                    </div>
                  )}
                  
                  {formData.gender && (
                    <div className="bg-blue-400 rounded-lg p-4">
                      <h4 className="font-medium mb-1">Gender</h4>
                      <p className="text-blue-100">{formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1)}</p>
                    </div>
                  )}
                  
                  {selectedSymptoms.length > 0 && (
                    <div className="bg-blue-400 rounded-lg p-4">
                      <h4 className="font-medium mb-1">Symptoms</h4>
                      <p className="text-blue-100">{selectedSymptoms.join(', ')}</p>
                    </div>
                  )}
                  
                  {formData.allergies.length > 0 && (
                    <div className="bg-blue-400 rounded-lg p-4">
                      <h4 className="font-medium mb-1">Allergies</h4>
                      <p className="text-blue-100">{formData.allergies.join(', ')}</p>
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

export default MedicalForm;