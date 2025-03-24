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
import { User, Calendar, VenusAndMars, Weight, Thermometer, FileText, NutOff } from 'lucide-react';

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
  }).default(70),
  forSelf: z.boolean().default(true),
  allergies: z.array(z.string()).optional().default([]),
  symptoms: z.array(z.string()).min(3, {
    message: 'At least three symptoms are required.',
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface MedicalFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleFormSubmit: (data: any) => void;
}

const MedicalForm: React.FC<MedicalFormProps> = ({ handleFormSubmit }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const { control, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      age: '',
      gender: '',
      weight: undefined,
      forSelf: true,
      allergies: [],
      symptoms: [],
    },
    // mode: 'onChange'
  });

  const steps = [
    { id: 1, title: 'Name', icon: <User />, description: 'What is your name?' },
    { id: 2, title: 'Age', icon: <Calendar />, description: 'How old are you?' },
    { id: 3, title: 'Gender', icon: <VenusAndMars />, description: 'Sex assigned at birth' },
    { id: 4, title: 'Weight', icon: <Weight />, description: 'What is your weight?' },
    { id: 5, title: 'Symptoms', icon: <Thermometer />, description: 'Add your symptoms' },
    { id: 6, title: 'Allergies', icon: <NutOff />, description: 'Do you have any allergies?' },
    { id: 7, title: 'Summary', icon: <FileText />, description: 'Review your information' },
  ];


  const totalSteps = steps.length;

  const [completeSteps, steCompleteSteps] = useState<number[]>([]);

  const nextStep = () => {
    if (currentStep < totalSteps) {
      if(!completeSteps.includes(currentStep)){
        steCompleteSteps([...completeSteps, currentStep]);
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
      <Card className="w-full max-w-5xl shadow-lg">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {/* Left Section - Form Wizard */}
            <div className="md:w-2/3 p-6 md:p-8">
              <div className="mb-2">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white mr-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold">Medical Form</h2>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold mt-10">{steps[currentStep - 1].description}</h1>
              </div>

              <form onSubmit={handleSubmit(onSubmit)}>
                {/* Step 1: Who is the survey for */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    {/* Step 1 – For Self or Someone Else */}
                    <Controller
                      name="forSelf"
                      control={control}
                      render={({ field }) => (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div
                            className={`border rounded-lg p-6 flex flex-col items-center cursor-pointer transition-all hover:border-blue-500 ${field.value ? 'border-blue-500 bg-blue-50' : ''}`}
                            onClick={() => field.onChange(true)}
                          >
                            <div className="w-16 h-16 text-blue-500 mb-4">
                              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" />
                                <path d="M6 21V19C6 16.7909 7.79086 15 10 15H14C16.2091 15 18 16.7909 18 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
                                <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2" />
                                <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="currentColor" strokeWidth="2" />
                              </svg>
                            </div>
                            <p className="text-lg font-medium">Someone else</p>
                          </div>
                        </div>
                      )}
                    />

                    {/* Step 1 – Name Input */}
                    <Controller
                      name="name"
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-gray-400">Full Name</Label>
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
                    <Label htmlFor="age" className="text-sm text-gray-400">Type your age. Age must be between 18 and 130.</Label>
                    <Controller
                      name="age"
                      control={control}
                      render={({ field }) => (
                        <div className="relative">
                          <Input
                            {...field}
                            id="age"
                            type="number"
                            className="h-12 mt-3 max-w-60"
                            placeholder="Enter your age"
                          />
                          <div className="absolute right-3 top-3 text-gray-500">
                            years old
                          </div>
                        </div>
                      )}
                    />
                    {Number(formData.age) < 18 || Number(formData.age) > 130 ? (
                      <p className="text-sm text-red-500">Age should be in range 18 to 130</p>
                    ) : null}
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
                                <circle cx="12" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
                                <path d="M12 15V21" stroke="currentColor" strokeWidth="2" />
                                <path d="M9 18H15" stroke="currentColor" strokeWidth="2" />
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
                                <circle cx="10" cy="14" r="5" stroke="currentColor" strokeWidth="2" />
                                <path d="M14 10L19 5" stroke="currentColor" strokeWidth="2" />
                                <path d="M15 5H19V9" stroke="currentColor" strokeWidth="2" />
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

                {/* Step 4: Weight */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <Label htmlFor="weight" className="text-base text-gray-400">Weight (kg)</Label>
                    <Controller
                      name="weight"
                      control={control}
                      rules={{ required: true, min: 20, max: 150 }}
                      render={({ field }) => (
                        <div className="relative">
                          <Input
                            {...field}
                            id="weight"
                            type="number"
                            className="h-12 mt-3 max-w-60"
                            placeholder="Enter your weight"
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                          <div className="absolute right-3 top-3 text-gray-500">
                            kg
                          </div>
                        </div>
                      )}
                    />
                    {errors.weight && (
                      <p className="text-sm text-red-500">
                        {errors.weight.type === 'required' && 'Weight is required'}
                        {errors.weight.type === 'min' && 'Weight must be at least 20 kg'}
                        {errors.weight.type === 'max' && 'Weight must be at most 150 kg'}
                      </p>
                    )}
                  </div>
                )}

                {/* Step 5: Symptoms */}
                {currentStep === 5 && (
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
                    {selectedSymptoms.length < 3 && (
                      <p className="text-sm text-red-500">At least three symptoms are required</p>
                    )}
                    {errors.symptoms && selectedSymptoms.length === 0 && (
                      <p className="text-sm text-red-500">At least one symptom is required</p>
                    )}
                  </div>
                )}

                {/* Step 6: Allergies */}
                {currentStep === 6 && (
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

                {/* Step 7: Summary */}
                {currentStep === 7 && (
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
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    variant='blueButton'
                  >
                    Back
                  </Button>

                  {currentStep < totalSteps ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={
                        (currentStep === 1 && !formData.name) ||
                        (currentStep === 2 && !formData.age) ||
                        (currentStep === 3 && !formData.gender) ||
                        (currentStep === 4 && (!formData.weight || formData.weight < 20 || formData.weight > 150)) ||
                        (currentStep === 5 && selectedSymptoms.length < 3)
                      }
                      variant='blueButton'
                    >
                      Next
                    </Button>
                  ) : (
                    <div onClick={() => handleFormSubmit(control._formValues)} className='cursor-pointer'>Submit</div>
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
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${completeSteps.includes(step.id)
                          ? 'bg-blue-500 text-white'
                          : currentStep === step.id
                            ? 'bg-blue-200 text-blue-800'
                            : 'bg-white text-blue-400'
                        }`}
                    >
                      {index + 1}
                    </div>
                  ))}
                </div>
                <div className="relative h-1 bg-white">
                  <div
                    className="absolute h-1 bg-blue-400 transition-all duration-300"
                    style={{ width: `${((completeSteps.length) / (totalSteps - 1)) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1">
                  {steps.map((step) => (
                    <div key={step.id} className="w-8 text-center text-xs">
                      <span className=''>{step.icon}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Section - Progress & Summary */}
            <div className="lg:w-1/3 lg:min-w-[250px] lg:max-w-[350px] bg-blue-500 text-white p-6 md:p-8">

              <div className="space-y-6">
                <h3 className="text-xl font-semibold mb-4">Form Summary</h3>

                <div className="space-y-4">
                  <div className="bg-blue-400 rounded-lg p-4">
                    <h4 className="font-medium mb-1">Name</h4>
                    <p className="text-blue-100">{formData.name}</p>
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

                  {formData.weight && (
                    <div className="bg-blue-400 rounded-lg p-4">
                      <h4 className="font-medium mb-1">Weight</h4>
                      <p className="text-blue-100">{formData.weight} kg</p>
                    </div>
                  )}

                  {selectedSymptoms.length > 0 && (
                    <div className="bg-blue-400 rounded-lg p-4">
                      <h4 className="font-medium mb-1">Symptoms</h4>
                      <p className="text-blue-100 break-words">{selectedSymptoms.join(', ')}</p>
                    </div>
                  )}

                  {formData.allergies.length > 0 && (
                    <div className="bg-blue-400 rounded-lg p-4">
                      <h4 className="font-medium mb-1">Allergies</h4>
                      <p className="text-blue-100 break-words">{formData.allergies.join(', ')}</p>
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