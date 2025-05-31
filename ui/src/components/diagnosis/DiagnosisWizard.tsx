import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Send, Loader2, User, Users, Check, X, MapPin, Clock, Thermometer, Stethoscope } from 'lucide-react';
import { FASTAPI_URL } from '@/utils/api';

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
}

// interface SessionSummary {
//   symptoms: string[];
//   background_traits: Record<string, string>;
//   diagnosis_results: { diagnosis: DiagnosisResult[] };
// }

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
  const navigate = useNavigate();
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
      const systemMessage: Message = { text: data.message, sender: 'system', timestamp: new Date().toISOString() };
      setSessionData(prev => ({
        ...prev,
        messages: [...prev.messages, systemMessage],
      }));
      // Update session data based on the current step (inferred from the last system message)
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
      } else if (data.message.includes('possible conditions include')) {
        try {
          // Check if results are already parsed
          const results = typeof data.diagnosis_results === 'object' 
            ? data.diagnosis_results
            : data.message.includes('[') // Try to extract JSON if present
              ? JSON.parse(data.message.substring(data.message.indexOf('[')))
              : [];

          const formattedResults = Array.isArray(results) 
            ? results.map((r: any) => ({
                disease: r.disease,
                confidence: r.confidence,
                severity: r.severity || 'medium',
                symptom_coverage: r.symptom_coverage || 0,
                key_symptoms: r.key_symptoms || [],
              }))
            : [];

          setSessionData(prev => ({
            ...prev,
            diagnosis_results: formattedResults,
          }));
        } catch (error) {
          console.error('Error parsing diagnosis results:', error);
          // Fallback for parsing errors
          setSessionData(prev => ({
            ...prev,
            diagnosis_results: [{
              disease: 'Results could not be parsed',
              confidence: 0,
              severity: 'medium',
              symptom_coverage: 0,
              key_symptoms: [],
            }],
          }));
        }
      }
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process message');
      console.error('Message processing error:', err);
      setLoading(false);
    }
  };

  const renderCommonSymptoms = () => {
    const commonSymptoms = [
      "Headache", "Fever", "Cough", "Sore throat", 
      "Fatigue", "Stomach pain", "Nausea", "Dizziness"
    ];
    
    return (
      <div className="grid grid-cols-2 gap-1 mb-3">
        {commonSymptoms.map(symptom => (
          <Button 
            key={symptom}
            variant='blueButton'
            size="sm"
            className="text-xs py-1 px-2 h-7"
            onClick={() => processMessage(symptom, true)}
          >
            {symptom}
          </Button>
        ))}
      </div>
    );
  };

  const renderInput = () => {
    const lastMessage = sessionData.messages[sessionData.messages.length - 1]?.text || '';
    
    if (lastMessage.includes('yourself or someone else')) {
      return (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-center mb-2">Who are you seeking diagnosis for?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            <div
              className="border border-gray-200 rounded-md p-2 flex items-center cursor-pointer transition-all duration-200 hover:border-blue-500 hover:bg-blue-50"
              onClick={() => processMessage('Myself', true)}
            >
              <div className="w-5 h-5 text-blue-500 mr-2">
                <User className="w-full h-full" />
              </div>
              <div>
                <p className="text-xs font-medium">Myself</p>
                <p className="text-xs text-gray-500">For my own symptoms</p>
              </div>
            </div>

            <div
              className="border border-gray-200 rounded-md p-2 flex items-center cursor-pointer transition-all duration-200 hover:border-blue-500 hover:bg-blue-50"
              onClick={() => processMessage('Someone else', true)}
            >
              <div className="w-5 h-5 text-blue-500 mr-2">
                <Users className="w-full h-full" />
              </div>
              <div>
                <p className="text-xs font-medium">Someone else</p>
                <p className="text-xs text-gray-500">Helping someone else</p>
              </div>
            </div>
          </div>
        </div>
      )} else if (lastMessage.includes('substances') || lastMessage.includes('doctor') || lastMessage.includes('medication') || lastMessage.includes('Are you experiencing')) {
      const isSubstances = lastMessage.includes('substances');
      const isDoctor = lastMessage.includes('doctor');
      const isMedication = lastMessage.includes('medication');
      
      let questionTitle = 'Please select an option';
      let yesText = 'Yes';
      let noText = 'No';
      let yesIcon = <Check className="w-full h-full" />;
      let noIcon = <X className="w-full h-full" />;
      let yesColor = 'green';
      let noColor = 'red';
      
      if (isSubstances) {
        questionTitle = 'Have you used any substances recently?';
        yesText = 'Yes, I have';
        noText = 'No, I haven\'t';
      } else if (isDoctor) {
        questionTitle = 'Have you seen a doctor recently?';
        yesText = 'Yes, recently';
        noText = 'No, not recently';
        yesIcon = <Stethoscope className="w-full h-full" />;
        yesColor = 'blue';
        noColor = 'gray';
      } else if (isMedication) {
        questionTitle = 'Are you currently taking any medication?';
        yesText = 'Yes, taking medication';
        noText = 'No medication';
      }

      return (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-center mb-2">{questionTitle}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            <div
              className={`border border-gray-200 rounded-md p-2 flex items-center cursor-pointer transition-all duration-200 hover:border-${yesColor}-500 hover:bg-${yesColor}-50`}
              onClick={() => processMessage('Yes', true)}
            >
              <div className={`w-5 h-5 text-${yesColor}-500 mr-2`}>
                {yesIcon}
              </div>
              <p className="text-xs font-medium">{yesText}</p>
            </div>

            <div
              className={`border border-gray-200 rounded-md p-2 flex items-center cursor-pointer transition-all duration-200 hover:border-${noColor}-500 hover:bg-${noColor}-50`}
              onClick={() => processMessage('No', true)}
            >
              <div className={`w-5 h-5 text-${noColor}-500 mr-2`}>
                {noIcon}
              </div>
              <p className="text-xs font-medium">{noText}</p>
            </div>
          </div>
        </div>
      );
    } else if (lastMessage.includes('traveled')) {
      return (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-center mb-2">Have you traveled recently?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            <div
              className="border border-gray-200 rounded-md p-2 flex items-center cursor-pointer transition-all duration-200 hover:border-blue-500 hover:bg-blue-50"
              onClick={() => processMessage('Yes', true)}
            >
              <div className="w-5 h-5 text-blue-500 mr-2">
                <MapPin className="w-full h-full" />
              </div>
              <div>
                <p className="text-xs font-medium">Recently traveled</p>
                <p className="text-xs text-gray-500">Past few weeks</p>
              </div>
            </div>

            <div
              className="border border-gray-200 rounded-md p-2 flex items-center cursor-pointer transition-all duration-200 hover:border-gray-500 hover:bg-gray-50"
              onClick={() => processMessage('No', true)}
            >
              <div className="w-5 h-5 text-gray-500 mr-2">
                <X className="w-full h-full" />
              </div>
              <div>
                <p className="text-xs font-medium">No recent travel</p>
                <p className="text-xs text-gray-500">Haven't traveled</p>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (lastMessage.includes('symptoms start')) {
      const timeOptions = [
        { value: 'Less than a day', label: 'Less than a day', description: 'Just started', color: 'red', textColor: 'text-red-500' },
        { value: '1-3 days', label: '1-3 days', description: 'Recent onset', color: 'orange', textColor: 'text-orange-500' },
        { value: '4-7 days', label: '4-7 days', description: 'About a week', color: 'yellow', textColor: 'text-yellow-600' },
        { value: 'More than a week', label: 'More than a week', description: 'Ongoing', color: 'blue', textColor: 'text-blue-500' }
      ];

      return (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-center mb-2">When did your symptoms start?</h3>
          <div className="grid grid-cols-2 gap-1">
            {timeOptions.map((option) => (
              <div
                key={option.value}
                className={`border border-gray-200 rounded-md p-2 flex items-center cursor-pointer transition-all duration-200 hover:border-${option.color}-500 hover:bg-${option.color}-50`}
                onClick={() => processMessage(option.value, true)}
              >
                <div className={`w-4 h-4 ${option.textColor} mr-1 flex items-center justify-center`}>
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
      );
    } else if (lastMessage.includes('temperature')) {
      const temperatureOptions = [
        { value: 'Normal (98-99°F)', label: 'Normal', description: '98-99°F', color: 'green', textColor: 'text-green-500' },
        { value: 'Low-grade (99-100°F)', label: 'Low-grade fever', description: '99-100°F', color: 'yellow', textColor: 'text-yellow-600' },
        { value: 'Moderate (100-102°F)', label: 'Moderate fever', description: '100-102°F', color: 'orange', textColor: 'text-orange-500' },
        { value: 'High (>102°F)', label: 'High fever', description: '>102°F', color: 'red', textColor: 'text-red-500' }
      ];

      return (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-center mb-2">What's your current temperature?</h3>
          <div className="grid grid-cols-2 gap-1">
            {temperatureOptions.map((option) => (
              <div
                key={option.value}
                className={`border border-gray-200 rounded-md p-2 flex items-center cursor-pointer transition-all duration-200 hover:border-${option.color}-500 hover:bg-${option.color}-50`}
                onClick={() => processMessage(option.value, true)}
              >
                <div className={`w-4 h-4 ${option.textColor} mr-1`}>
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
      );
    } else if (lastMessage.includes('severe')) {
      return (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-center">How severe are your symptoms?</h3>
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
                <div className={`p-1 rounded text-center ${parseInt(currentInput || '5') <= 3 ? 'bg-green-100 border border-green-500' : 'bg-gray-100 border border-gray-300'}`}>
                  <p className="text-xs font-medium">Mild</p>
                  <p className="text-xs text-gray-600">1-3</p>
                </div>
                <div className={`p-1 rounded text-center ${parseInt(currentInput || '5') > 3 && parseInt(currentInput || '5') <= 7 ? 'bg-yellow-100 border border-yellow-500' : 'bg-gray-100 border border-gray-300'}`}>
                  <p className="text-xs font-medium">Moderate</p>
                  <p className="text-xs text-gray-600">4-7</p>
                </div>
                <div className={`p-1 rounded text-center ${parseInt(currentInput || '5') > 7 ? 'bg-red-100 border border-red-500' : 'bg-gray-100 border border-gray-300'}`}>
                  <p className="text-xs font-medium">Severe</p>
                  <p className="text-xs text-gray-600">8-10</p>
                </div>
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
      );
    } else if (lastMessage.includes('symptoms')) {
      return (
        <div className="space-y-2">
          <div className="text-center">
            <h4 className="text-xs font-medium mb-1">What symptoms are you experiencing?</h4>
            <p className="text-xs text-gray-600">Click common symptoms or describe your own</p>
          </div>
          
          <div className="bg-blue-50 p-2 rounded-md">
            <h5 className="text-xs font-medium text-blue-800 mb-1">Common Symptoms</h5>
            {renderCommonSymptoms()}
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
      );
    } else if (lastMessage.includes('possible conditions include')) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center">Diagnosis Results</h3>
          {sessionData.diagnosis_results?.map((result, index) => (
            <div
              key={index}
              className={`p-4 border-2 rounded-xl ${
                result.severity === 'high'
                  ? 'border-red-300 bg-red-50'
                  : result.severity === 'medium'
                    ? 'border-yellow-300 bg-yellow-50'
                    : 'border-green-300 bg-green-50'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">{result.disease}</h4>
                <span
                  className={`text-sm px-3 py-1 rounded-full font-medium ${
                    result.severity === 'high'
                      ? 'bg-red-100 text-red-800'
                      : result.severity === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                  }`}
                >
                  {result.confidence}%
                </span>
              </div>
              <Progress
                value={result.confidence}
                className={`${
                  result.severity === 'high'
                    ? 'bg-red-200'
                    : result.severity === 'medium'
                      ? 'bg-yellow-200'
                      : 'bg-green-200'
                }`}
              />
              <p className="mt-2 text-sm">Matched Symptoms: {result.key_symptoms.join(', ')}</p>
              <p className="mt-2 text-sm">Symptom Coverage: {result.symptom_coverage}%</p>
            </div>
          ))}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This is an AI-generated diagnosis. Consult a healthcare provider for professional advice.
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/dashboard')} className="w-full h-12" variant="blueButton">
            Finish Diagnosis
          </Button>
        </div>
      );
    } else {
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
    }
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
          className="border rounded-lg h-[calc(100vh-300px)] overflow-y-auto p-4 mb-6"
        >
          {sessionData.messages.map((message, index) => {
            const isLastSystemMessage = index === sessionData.messages.length - 1 && message.sender === 'system';
            
            return (
              <div key={index}>
                <div className={`mb-3 ${message.sender === 'user' ? 'text-right' : ''}`}>
                  <div
                    className={`inline-block p-3 rounded-lg max-w-[80%] ${
                      message.sender === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {message.text}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(message.timestamp).toLocaleString()}
                  </p>
                </div>
                
                {/* Show selection UI inline for the last system message */}
                {isLastSystemMessage && (
                  <div className="mt-4 mb-4">
                    {renderInput()}
                  </div>
                )}
              </div>
            );
          })}
          
          {loading && (
            <div className="flex justify-start mb-3">
              <div className="bg-gray-100 p-3 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-0.5" />
        </div>
        <div className="min-h-[100px]">
          {loading ? (
            <div className="flex justify-center items-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
};

export default DiagnosisWizard;