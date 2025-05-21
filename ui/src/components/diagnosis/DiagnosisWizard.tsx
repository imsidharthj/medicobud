import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Send, History, Loader2 } from 'lucide-react';
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

interface SessionSummary {
  symptoms: string[];
  background_traits: Record<string, string>;
  diagnosis_results: { diagnosis: DiagnosisResult[] };
}

interface Session {
  session_id: string;
  start_time: string;
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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<{ messages: Message[], summary: SessionSummary } | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);
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
    fetchSessions();
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

  const fetchSessions = async () => {
    try {
      const email = user?.emailAddresses[0]?.emailAddress;
      const url = email 
        ? `${FASTAPI_URL}/api/diagnosis/sessions?email=${encodeURIComponent(email)}`
        : `${FASTAPI_URL}/api/diagnosis/sessions`;
        
      const response = await fetch(url);
      const data = await response.json();
      setSessions(data);
    } catch (err) {
      console.error('Failed to fetch sessions', err);
    }
  };

  const fetchSessionDetails = async (sessionId: string) => {
    try {
      const response = await fetch(`${FASTAPI_URL}/api/diagnosis/session/${sessionId}`);
      const data = await response.json();
      setSessionDetails(data);
      setSelectedSession(sessionId);
    } catch (err) {
      console.error('Failed to fetch session details', err);
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
      <div className="grid grid-cols-2 gap-2 mb-4">
        {commonSymptoms.map(symptom => (
          <Button 
            key={symptom}
            variant='blueButton'
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
        <RadioGroup
          onValueChange={(value) => processMessage(value, true)}
          className="grid grid-cols-2 gap-2"
        >
          <div className="flex items-center space-x-2 p-3 rounded-md border">
            <RadioGroupItem value="Myself" id="myself" />
            <Label htmlFor="myself">Myself</Label>
          </div>
          <div className="flex items-center space-x-2 p-3 rounded-md border">
            <RadioGroupItem value="Someone else" id="someone_else" />
            <Label htmlFor="someone_else">Someone else</Label>
          </div>
        </RadioGroup>
      );
    } else if (lastMessage.includes('substances') || lastMessage.includes('doctor') || lastMessage.includes('medication')) {
      return (
        <RadioGroup
          onValueChange={(value) => processMessage(value, true)}
          className="grid grid-cols-2 gap-2"
        >
          <div className="flex items-center space-x-2 p-3 rounded-md border">
            <RadioGroupItem value="Yes" id="yes" />
            <Label htmlFor="yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2 p-3 rounded-md border">
            <RadioGroupItem value="No" id="no" />
            <Label htmlFor="no">No</Label>
          </div>
        </RadioGroup>
      );
    } else if (lastMessage.includes('traveled')) {
      return (
        <Select onValueChange={(value) => processMessage(value, true)}>
          <SelectTrigger>
            <SelectValue placeholder="Select travel status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Yes">Recently traveled</SelectItem>
            <SelectItem value="No">No recent travel</SelectItem>
          </SelectContent>
        </Select>
      );
    } else if (lastMessage.includes('symptoms start')) {
      return (
        <Select onValueChange={(value) => processMessage(value, true)}>
          <SelectTrigger>
            <SelectValue placeholder="Select duration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Less than a day">Less than a day</SelectItem>
            <SelectItem value="1-3 days">1-3 days</SelectItem>
            <SelectItem value="4-7 days">4-7 days</SelectItem>
            <SelectItem value="More than a week">More than a week</SelectItem>
          </SelectContent>
        </Select>
      );
    } else if (lastMessage.includes('severe')) {
      return (
        <div className="space-y-2">
          <Label>Severity (1-10)</Label>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[parseInt(currentInput) || 5]}
            onValueChange={([value]) => setCurrentInput(value.toString())}
          />
          <div className="text-center">
            {currentInput || 5}: {parseInt(currentInput || '5') <= 3 ? 'Mild' : parseInt(currentInput || '5') <= 7 ? 'Moderate' : 'Severe'}
          </div>
          <Button onClick={() => processMessage(currentInput || '5', true)}>Submit</Button>
        </div>
      );
    } else if (lastMessage.includes('temperature')) {
      return (
        <Select onValueChange={(value) => processMessage(value, true)}>
          <SelectTrigger>
            <SelectValue placeholder="Select temperature" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Normal (98-99°F)">Normal (98-99°F)</SelectItem>
            <SelectItem value="Low-grade (99-100°F)">Low-grade (99-100°F)</SelectItem>
            <SelectItem value="Moderate (100-102°F)">Moderate (100-102°F)</SelectItem>
            <SelectItem value="High (>102°F)">High (102°F)</SelectItem>
          </SelectContent>
        </Select>
      );
    } else if (lastMessage.includes('symptoms')) {
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Common symptoms:</h4>
          {renderCommonSymptoms()}
          <div className="text-sm mb-1">Or enter your own symptoms:</div>
          <div className="space-y-2">
            <Textarea
              placeholder="List symptoms (e.g., headache, fever)"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
            />
            <Button onClick={() => processMessage(currentInput, true)} disabled={!currentInput.trim()}>
              Submit
            </Button>
          </div>
        </div>
      );
    } else if (lastMessage.includes('Are you experiencing')) {
      return (
        <RadioGroup
          onValueChange={(value) => processMessage(value, true)}
          className="grid grid-cols-2 gap-2"
        >
          <div className="flex items-center space-x-2 p-3 rounded-md border">
            <RadioGroupItem value="Yes" id="yes" />
            <Label htmlFor="yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2 p-3 rounded-md border">
            <RadioGroupItem value="No" id="no" />
            <Label htmlFor="no">No</Label>
          </div>
        </RadioGroup>
      );
    } else if (lastMessage.includes('possible conditions include')) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Diagnosis Results</h3>
          {sessionData.diagnosis_results?.map((result, index) => (
            <div
              key={index}
              className={`p-4 border rounded-lg ${
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
                  className={`text-sm px-2 py-1 rounded-full ${
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
          <Button onClick={() => navigate('/dashboard')}>Finish</Button>
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
          />
          <Button
            variant='blueButton'
            onClick={() => processMessage(currentInput)}
            disabled={!currentInput.trim() || loading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      );
    }
  };

  const renderHistory = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Session History</h3>
      {sessions.length === 0 ? (
        <p>No previous sessions found.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.session_id}
              className="p-3 border rounded-md cursor-pointer hover:bg-gray-100"
              onClick={() => fetchSessionDetails(session.session_id)}
            >
              <p className="font-medium">Session: {session.session_id}</p>
              <p className="text-sm text-gray-500">
                Started: {new Date(session.start_time).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
      {selectedSession && sessionDetails && (
        <Tabs defaultValue="messages" className="mt-4">
          <TabsList>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>
          <TabsContent value="messages">
            <div className="border rounded-lg h-64 overflow-y-auto p-4">
              {sessionDetails.messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-3 ${message.sender === 'user' ? 'text-right' : ''}`}
                >
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
              ))}
            </div>
          </TabsContent>
          <TabsContent value="summary">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Symptoms</h4>
                <p>{sessionDetails.summary.symptoms.join(', ') || 'None'}</p>
              </div>
              <div>
                <h4 className="font-medium">Background Traits</h4>
                <ul className="list-disc pl-5">
                  {Object.entries(sessionDetails.summary.background_traits).map(([key, value]) => (
                    <li key={key}>{key}: {value}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium">Diagnosis Results</h4>
                {sessionDetails.summary.diagnosis_results?.diagnosis?.map((result, index) => (
                  <div key={index} className="p-2 border rounded-md mt-2">
                    <p><strong>{result.disease}</strong>: {result.confidence}%</p>
                    <p>Severity: {result.severity}</p>
                    <p>Symptoms: {result.key_symptoms.join(', ')}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">MedicoBud Assistant</h2>
          <Button
            variant='blueButton'
            onClick={() => setShowHistory(true)}
          >
            <History className="w-4 h-4 mr-2" />
            View History
          </Button>
        </div>
        {error && (
          <Alert className="mb-4" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {showHistory ? (
          <div>
            <Button
              variant="outline"
              onClick={() => setShowHistory(false)}
              className="mb-4"
            >
              Back to Chat
            </Button>
            {renderHistory()}
          </div>
        ) : (
          <>
            <div 
              ref={chatContainerRef}
              className="border rounded-lg h-80 overflow-y-auto p-4 mb-6"
            >
              {sessionData.messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-3 ${message.sender === 'user' ? 'text-right' : ''}`}
                >
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
              ))}
              <div ref={messagesEndRef} className="h-0.5" />
            </div>
            <div className="min-h-[150px]">
              {loading ? (
                <div className="flex justify-center items-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                renderInput()
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

export default DiagnosisWizard;