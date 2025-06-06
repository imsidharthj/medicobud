import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Send, Loader2, User, Users, Check, X, MapPin, Clock, Thermometer, Stethoscope } from 'lucide-react';
import { FASTAPI_URL } from '@/utils/api';
import DiagnosisResultFormatter, { formatDiagnosisResults } from './DiagnosisResultFormatter';

const COMMON_SYMPTOMS = [
  "Headache", "Fever", "Cough", "Sore throat", 
  "Fatigue", "Stomach pain", "Nausea", "Dizziness"
];

interface UserProfile {
  name: string;
  age: number;
  gender: string;
  allergies: string[];
  weight?: number;
  height?: number;
  bloodType?: string;
}

interface Message {
  text: string;
  sender: 'system' | 'user';
  timestamp: string;
}

interface DiagnosisResult {
  disease: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  symptom_coverage: number;
  key_symptoms: string[];
  explanations?: string[];
}

interface SessionData {
  sessionId?: string;
  messages: Message[];
  symptoms: string[];
  background_traits: Record<string, string>;
  timing_intensity: Record<string, string>;
  care_medication: Record<string, string>;
  diagnosis_results?: DiagnosisResult[];
}

export const DiagnosisWizard: React.FC<{ userProfile?: UserProfile }> = ({ userProfile }) => {
  const { user } = useUser();
  const [sessionData, setSessionData] = useState<SessionData>({
    sessionId: undefined,
    messages: [{ text: "How are you feeling today?", sender: 'system', timestamp: new Date().toISOString() }],
    symptoms: [],
    background_traits: {},
    timing_intensity: {},
    care_medication: {},
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentInput, setCurrentInput] = useState<string>('');
  const [isDiagnosisComplete, setIsDiagnosisComplete] = useState<boolean>(false); 
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const chatContainerRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    if (userProfile) {
      setSessionData(prev => ({
        ...prev,
        background_traits: {
          ...prev.background_traits,
          age: userProfile.age.toString(),
          gender: userProfile.gender,
        },
      }));
    }
    startSession();
  }, [userProfile]);

  useEffect(() => {
    if (sessionData.messages.length > 0) {
      scrollToBottom();
    }
  }, [sessionData.messages]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (isNearBottom || sessionData.messages.length > 0) {
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'end'
            });
          }
        }, 100);
      }
    }
  };

  const startSession = async () => {
    try {
      setLoading(true);
      setIsDiagnosisComplete(false); 
      const response = await fetch(`${FASTAPI_URL}/api/diagnosis/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.emailAddresses[0]?.emailAddress,
          user_id: user?.id
        })
      });
      const data = await response.json();
      setSessionData(prev => ({
        ...prev,
        sessionId: data.session_id,
        messages: [{ text: data.message, sender: 'system', timestamp: new Date().toISOString() }],
      }));
      setLoading(false);
    } catch (err) {
      setError('Failed to start session');
      setLoading(false);
    }
  };

  const processMessage = async (input: string, isSelection: boolean = false) => {
    if (!sessionData.sessionId) return;
    console.log(isSelection)
    const userMessage: Message = { text: input, sender: 'user', timestamp: new Date().toISOString() };
    setSessionData(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
    }));
    setCurrentInput('');

    try {
      setLoading(true);
      const response = await fetch(`${FASTAPI_URL}/api/diagnosis/session/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionData.sessionId, text: input }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.diagnosis_data && (data.diagnosis_data.diagnosis || data.diagnosis_data.secondary_diagnosis)) {
        const formattedMessage = formatDiagnosisResults(data.diagnosis_data, sessionData.symptoms);
        const systemMessage: Message = { 
          text: formattedMessage, 
          sender: 'system', 
          timestamp: new Date().toISOString() 
        };
        
        setSessionData(prev => ({
          ...prev,
          messages: [...prev.messages, systemMessage],
          diagnosis_results: data.diagnosis_data.diagnosis || [],
        }));
        setIsDiagnosisComplete(true); 
      } else {
        const systemMessage: Message = { text: data.message, sender: 'system', timestamp: new Date().toISOString() };
        setSessionData(prev => ({
          ...prev,
          messages: [...prev.messages, systemMessage],
        }));
      }

      if (data.message.includes('yourself or someone else')) {
        setSessionData(prev => ({
          ...prev,
          background_traits: { ...prev.background_traits, is_self: input.toLowerCase() === 'myself' ? 'yes' : 'no' },
        }));
      } else if (data.message.includes('substances') || data.message.includes('traveled')) {
        setSessionData(prev => ({
          ...prev,
          background_traits: { ...prev.background_traits, [data.message]: input },
        }));
      } else if (data.message.includes('symptoms')) {
        setSessionData(prev => ({
          ...prev,
          symptoms: [...prev.symptoms, ...input.split(',').map(s => s.trim()).filter(Boolean)],
        }));
      } else if (data.message.includes('symptoms start') || data.message.includes('severe') || data.message.includes('temperature')) {
        setSessionData(prev => ({
          ...prev,
          timing_intensity: { ...prev.timing_intensity, [data.message]: input },
        }));
      } else if (data.message.includes('doctor') || data.message.includes('medication')) {
        setSessionData(prev => ({
          ...prev,
          care_medication: { ...prev.care_medication, [data.message]: input },
        }));
      }
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process message');
      console.error('Message processing error:', err);
      setLoading(false);
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isUser = message.sender === 'user';
    const isDiagnosisResult = message.text.includes('MEDICAL ASSESSMENT RESULTS');
    
    // Determine if this is the last system message that requires an input
    // We only want to render input options for the very last system message
    // and only if the diagnosis is not complete.
    const isLastSystemMessage = !isUser && index === sessionData.messages.length - 1;

    const isInitialMessage = message.text.includes('How are you feeling today') || message.text.includes('feeling today');
    const isSymptomAnalysisQuestion = message.text.includes('Would you like to start a Symptom Analysis session?');
    const isPersonQuestion = message.text.includes('yourself or someone else');
    const isSubstanceQuestion = message.text.includes('substances');
    const isTravelQuestion = message.text.includes('traveled');
    const isDoctorQuestion = message.text.includes('doctor');
    const isMedicationQuestion = message.text.includes('medication');
    const isSymptomStartQuestion = message.text.includes('symptoms start');
    const isTemperatureQuestion = message.text.includes('temperature');
    const isSeverityQuestion = message.text.includes('severe');
    const isSymptomsQuestion = message.text.includes('symptoms') && !isSymptomStartQuestion && !isSymptomAnalysisQuestion;
    const isExperiencingQuestion = message.text.includes('Are you experiencing');
    
    return (
      <div key={index}>
        <div className={`mb-3 ${isUser ? 'text-right' : ''}`}>
          <div
            className={`inline-block p-3 rounded-lg max-w-[80%] ${
              isUser
                ? 'bg-blue-500 text-white'
                : isDiagnosisResult 
                  ? 'bg-white border border-gray-200 shadow-sm'
                  : 'bg-gray-100 text-gray-800'
            }`}
          >
            {isDiagnosisResult ? <DiagnosisResultFormatter message={message.text} /> : message.text}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(message.timestamp).toLocaleString()}
          </p>
          
          {/* Conditional rendering for input steps: 
              Only show if it's the last system message AND diagnosis is NOT complete.
              Also, don't show input for diagnosis result message itself.
          */}
          {isLastSystemMessage && !isDiagnosisComplete && !isDiagnosisResult && (
            <>
              {isSymptomAnalysisQuestion && (
                <div className="mt-4 max-w-[80%]">
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className="border border-gray-200 rounded-lg p-4 flex items-center cursor-pointer transition-all duration-200 hover:border-green-500 hover:bg-green-50 hover:shadow-md"
                      onClick={() => processMessage('Yes', true)}
                    >
                      <div className="w-6 h-6 text-green-500 mr-3">
                        <Check className="w-full h-full" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-700">Yes</p>
                        <p className="text-xs text-gray-500">Start analysis</p>
                      </div>
                    </div>

                    <div
                      className="border border-gray-200 rounded-lg p-4 flex items-center cursor-pointer transition-all duration-200 hover:border-red-500 hover:bg-red-50 hover:shadow-md"
                      onClick={() => processMessage('No', true)}
                    >
                      <div className="w-6 h-6 text-red-500 mr-3">
                        <X className="w-full h-full" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-red-700">No</p>
                        <p className="text-xs text-gray-500">Not now</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {isInitialMessage && (
                <div className="mt-4 max-w-[80%]">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'feeling well', label: 'Feeling well', description: "I'm doing good", color: 'green', icon: Check},
                      { value: 'sick', label: 'Sick', description: 'Not feeling good', color: 'red', icon: X },
                      { value: 'ill', label: 'Ill', description: "Something's wrong", color: 'orange', icon: AlertCircle },
                      { value: 'unwell', label: 'Unwell', description: 'Not quite right', color: 'yellow', icon: AlertCircle }
                    ].map((option) => {
                      const IconComponent = option.icon;
                      return (
                        <div
                          key={option.value}
                          className={`border border-gray-200 rounded-md p-3 flex items-center cursor-pointer transition-all duration-200 hover:border-${option.color}-500 hover:bg-${option.color}-50`}
                          onClick={() => processMessage(option.value, true)}
                        >
                          <div className={`w-5 h-5 text-${option.color}-500 mr-2 ${option.color === 'yellow' ? 'text-yellow-600' : ''}`}>
                            <IconComponent className="w-full h-full" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{option.label}</p>
                            <p className="text-xs text-gray-500">{option.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isPersonQuestion && (
                <div className="mt-4 max-w-[80%]">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'myself', label: 'Myself', description: "I'm experiencing symptoms", color: 'blue', icon: User },
                      { value: 'someone else', label: 'Someone else', description: 'Another person needs help', color: 'purple', icon: Users }
                    ].map((option) => {
                      const IconComponent = option.icon;
                      return (
                        <div
                          key={option.value}
                          className={`border border-gray-200 rounded-md p-4 flex items-center cursor-pointer transition-all duration-200 hover:border-${option.color}-500 hover:bg-${option.color}-50`}
                          onClick={() => processMessage(option.value, true)}
                        >
                          <div className={`w-6 h-6 text-${option.color}-500 mr-3`}>
                            <IconComponent className="w-full h-full" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{option.label}</p>
                            <p className="text-xs text-gray-500">{option.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(isSubstanceQuestion || isDoctorQuestion || isMedicationQuestion || isExperiencingQuestion) && (
                <div className="mt-4 max-w-[80%]">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'Yes', label: isSubstanceQuestion ? 'Yes, I have' : isDoctorQuestion ? 'Yes, recently' : isMedicationQuestion ? 'Yes, taking medication' : 'Yes',
                        description: isSubstanceQuestion ? 'Used substances' : isDoctorQuestion ? 'Seen a doctor' : isMedicationQuestion ? 'On medication' : 'Confirm',
                        color: 'green', icon: isDoctorQuestion ? Stethoscope : Check },
                      { value: 'No', label: isSubstanceQuestion ? 'No, I haven\'t' : isDoctorQuestion ? 'No, not recently' : isMedicationQuestion ? 'No medication' : 'No',
                        description: isSubstanceQuestion ? 'No substances' : isDoctorQuestion ? 'Haven\'t seen doctor' : isMedicationQuestion ? 'Not on medication' : 'Decline',
                        color: 'red', icon: X }
                    ].map((option) => {
                      const IconComponent = option.icon;
                      return (
                        <div
                          key={option.value}
                          className={`border border-gray-200 rounded-md p-3 flex items-center cursor-pointer transition-all duration-200 hover:border-${option.color}-500 hover:bg-${option.color}-50`}
                          onClick={() => processMessage(option.value, true)}
                        >
                          <div className={`w-5 h-5 text-${option.color}-500 mr-2`}>
                            <IconComponent className="w-full h-full" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{option.label}</p>
                            <p className="text-xs text-gray-500">{option.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isTravelQuestion && (
                <div className="mt-4 max-w-[80%]">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'Yes', label: 'Recently traveled', description: 'Past few weeks', color: 'blue', icon: MapPin },
                      { value: 'No', label: 'No recent travel', description: 'Haven\'t traveled', color: 'gray', icon: X}
                    ].map((option) => {
                      const IconComponent = option.icon;
                      return (
                        <div
                          key={option.value}
                          className={`border border-gray-200 rounded-md p-3 flex items-center cursor-pointer transition-all duration-200 hover:border-${option.color}-500 hover:bg-${option.color}-50`}
                          onClick={() => processMessage(option.value, true)}
                        >
                          <div className={`w-5 h-5 text-${option.color}-500 mr-2`}>
                            <IconComponent className="w-full h-full" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{option.label}</p>
                            <p className="text-xs text-gray-500">{option.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isSymptomStartQuestion && (
                <div className="mt-4 max-w-[80%]">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'Less than a day', label: 'Less than a day', description: 'Just started', color: 'red' },
                      { value: '1-3 days', label: '1-3 days', description: 'Recent onset', color: 'orange' },
                      { value: '4-7 days', label: '4-7 days', description: 'About a week', color: 'yellow' },
                      { value: 'More than a week', label: 'More than a week', description: 'Ongoing', color: 'blue' }
                    ].map((option) => (
                      <div
                        key={option.value}
                        className={`border border-gray-200 rounded-md p-2 flex items-center cursor-pointer transition-all duration-200 hover:border-${option.color}-500 hover:bg-${option.color}-50`}
                        onClick={() => processMessage(option.value, true)}
                      >
                        <div className={`w-4 h-4 text-${option.color}-500 mr-1 ${option.color === 'yellow' ? 'text-yellow-600' : ''}`}>
                          <Clock className="w-full h-full" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">{option.label}</p>
                          <p className="text-xs text-gray-500">{option.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isTemperatureQuestion && (
                <div className="mt-4 max-w-[80%]">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'Normal (98-99°F)', label: 'Normal', description: '98-99°F', color: 'green' },
                      { value: 'Low-grade (99-100°F)', label: 'Low-grade fever', description: '99-100°F', color: 'yellow'},
                      { value: 'Moderate (100-102°F)', label: 'Moderate fever', description: '100-102°F', color: 'orange'},
                      { value: 'High (>102°F)', label: 'High fever', description: '102°F', color: 'red'}
                    ].map((option) => (
                      <div
                        key={option.value}
                        className={`border border-gray-200 rounded-md p-2 flex items-center cursor-pointer transition-all duration-200 hover:border-${option.color}-500 hover:bg-${option.color}-50`}
                        onClick={() => processMessage(option.value, true)}
                      >
                        <div className={`w-4 h-4 text-${option.color}-500 mr-1 ${option.color === 'yellow' ? 'text-yellow-600' : ''}`}>
                          <Thermometer className="w-full h-full" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">{option.label}</p>
                          <p className="text-xs text-gray-500">{option.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isSeverityQuestion && (
                <div className="mt-4 max-w-[80%]">
                  <div className="p-3 border border-gray-200 rounded-md bg-gray-50">
                    <Label className="text-xs font-medium mb-2 block text-center">Severity Level (1-10)</Label>
                    <div className="space-y-2">
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[parseInt(currentInput) || 5]}
                        onValueChange={([value]) => setCurrentInput(value.toString())}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>1 - Mild</span>
                        <span className="font-semibold text-xs text-blue-600">
                          {currentInput || 5}: {parseInt(currentInput || '5') <= 3 ? 'Mild' : parseInt(currentInput || '5') <= 7 ? 'Moderate' : 'Severe'}
                        </span>
                        <span>10 - Severe</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 mt-2">
                        {[
                          { label: 'Mild', range: '1-3', condition: parseInt(currentInput || '5') <= 3, bgColor: 'bg-green-100', borderColor: 'border-green-500' },
                          { label: 'Moderate', range: '4-7', condition: parseInt(currentInput || '5') > 3 && parseInt(currentInput || '5') <= 7, bgColor: 'bg-yellow-100', borderColor: 'border-yellow-500' },
                          { label: 'Severe', range: '8-10', condition: parseInt(currentInput || '5') > 7, bgColor: 'bg-red-100', borderColor: 'border-red-500' }
                        ].map((severity) => (
                          <div
                            key={severity.label}
                            className={`p-1 rounded text-center ${
                              severity.condition
                                ? `${severity.bgColor} border ${severity.borderColor}`
                                : 'bg-gray-100 border border-gray-300'
                            }`}
                          >
                            <p className="text-xs font-medium">{severity.label}</p>
                            <p className="text-xs text-gray-600">{severity.range}</p>
                          </div>
                        ))}
                      </div>
                      <Button 
                        onClick={() => processMessage(currentInput || '5', true)}
                        className="w-full mt-2 h-8 text-xs"
                        variant="blueButton"
                      >
                        Continue with Level {currentInput || 5}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {isSymptomsQuestion && (
                <div className="mt-4 max-w-[80%]">
                  <div className="bg-blue-50 p-2 rounded-md mb-2">
                    <h5 className="text-xs font-medium text-blue-800 mb-1">Common Symptoms</h5>
                    <div className="grid grid-cols-2 gap-1">
                      {COMMON_SYMPTOMS.map((symptom) => (
                        <Button 
                          key={symptom}
                          variant='blueButton'
                          size="sm"
                          className="text-xs py-1 px-2 h-6 border-blue-200 hover:bg-blue-100"
                          onClick={() => processMessage(symptom, true)}
                        >
                          {symptom}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500 font-medium">Or enter custom</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Describe your symptoms (e.g., headache, fever, nausea)"
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      className="min-h-[60px] border border-gray-200 focus:border-blue-500 text-xs"
                    />
                    <Button 
                      onClick={() => processMessage(currentInput, true)} 
                      disabled={!currentInput.trim()}
                      className="w-full h-8 text-xs"
                      variant="blueButton"
                    >
                      Submit Symptoms
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderInput = () => {
    // Hide the input field if diagnosis is complete
    if (isDiagnosisComplete) {
      return (
        <div className="text-center py-4">
          <p className="text-gray-600 mb-4">Diagnosis complete. Would you like to start a new session?</p>
          <Button onClick={startSession} variant="blueButton">
            Start New Session
          </Button>
        </div>
      );
    }

    return (
      <div className="flex gap-2">
        <Input
          placeholder="Type your response..."
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && currentInput.trim()) {
              processMessage(currentInput);
            }
          }}
          className="border-2 border-gray-200 focus:border-blue-500"
        />
        <Button
          variant='blueButton'
          onClick={() => processMessage(currentInput)}
          disabled={!currentInput.trim() || loading}
          className="px-6"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">MedicoBud Assistant</h2>
        </div>
        {error && (
          <Alert className="mb-4" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div 
          ref={chatContainerRef}
          className="border rounded-lg overflow-y-auto p-4 mb-4 h-[55vh] sm:h-[55vh] md:h-[60vh] lg:h-[65vh] xl:h-[65vh]"
        >
          {sessionData.messages.map((message, index) => (
            renderMessage(message, index)
          ))}
          
          {loading && (
            <div className="flex justify-start mb-3">
              <div className="bg-gray-100 p-3 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-0.5" />
        </div>
        
        <div className="border-t bg-white p-4 max-h-[40vh] sm:max-h-[35vh] md:max-h-[30vh] lg:max-h-[25vh] xl:max-h-[20vh] overflow-y-auto">
          {renderInput()}
        </div>
      </div>
    </Card>
  );
};

export default DiagnosisWizard;
