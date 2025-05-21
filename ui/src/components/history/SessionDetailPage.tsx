import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from "@clerk/clerk-react";

interface Message {
  sender: 'user' | 'system' | 'bot'; // Adjust based on your actual sender types
  text: string;
  timestamp: string;
}

interface DiagnosisResult {
  disease: string;
  probability: number;
  description?: string;
  symptoms_matched?: string[];
  // Add other fields your diagnosis_results might have
}

interface SessionDetails {
  session_info: {
    session_id: string;
    start_time: string;
    end_time: string | null;
    status: string;
    person_type: string | null;
    person_details: any; // Consider defining a type for this
  };
  user: {
    email: string | null;
    user_id: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  messages: Message[];
  summary: {
    symptoms: string[] | string | null; // API returns string, might need parsing
    background_traits: any | null; // Consider defining a type
    diagnosis_results: DiagnosisResult[] | any | null; // API returns object, might need parsing
  };
}

// Helper to format date
const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const parseJsonString = (jsonString: string | null | undefined, defaultValue: any = null) => {
  if (!jsonString) return defaultValue;
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Failed to parse JSON string:", jsonString, e);
    return defaultValue; // Or return the string itself if it's not meant to be JSON
  }
};


export default function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'chat'>('overview');
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (!sessionId) return;
      try {
        const token = await getToken();
        const response = await fetch(`/api/session/${sessionId}`, {
           headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          if (response.status === 404) throw new Error('Session not found');
          throw new Error('Failed to fetch session details');
        }
        const data = await response.json();
        setSessionDetails(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [sessionId, getToken]);

  if (loading) return <div className="container mx-auto p-4 text-center">Loading session details...</div>;
  if (error) return <div className="container mx-auto p-4 text-center text-red-500">Error: {error}</div>;
  if (!sessionDetails) return <div className="container mx-auto p-4 text-center">Session data not available.</div>;

  const { session_info, messages, summary, user } = sessionDetails;
  
  // Safely parse summary fields that might be JSON strings
  const parsedSymptoms = typeof summary.symptoms === 'string' ? parseJsonString(summary.symptoms, []) : (summary.symptoms || []);
  const parsedBackgroundTraits = typeof summary.background_traits === 'string' ? parseJsonString(summary.background_traits, {}) : (summary.background_traits || {});
  const parsedDiagnosisResults = typeof summary.diagnosis_results === 'string' ? parseJsonString(summary.diagnosis_results, []) : (summary.diagnosis_results || []);


  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Session Overview</h2>
        <p><strong>Chief Complaint:</strong> {Array.isArray(parsedSymptoms) && parsedSymptoms.length > 0 ? parsedSymptoms.join(', ') : "Not specified"}</p>
        <p><strong>Date & Time:</strong> {formatDate(session_info.start_time)}</p>
        {session_info.end_time && <p><strong>Ended:</strong> {formatDate(session_info.end_time)}</p>}
        <p><strong>Status:</strong> {session_info.status}</p>
      </div>
      
      {user && (
         <div>
          <h3 className="text-xl font-semibold mb-2">User Information</h3>
          <p><strong>Email:</strong> {user.email || 'N/A'}</p>
          {user.first_name && <p><strong>Name:</strong> {user.first_name} {user.last_name || ''}</p>}
        </div>
      )}

      {Object.keys(parsedBackgroundTraits).length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-2">Background Traits</h3>
          {/* Iterate through parsedBackgroundTraits or display as a JSON string for simplicity */}
          <pre className="bg-gray-100 p-2 rounded text-sm">{JSON.stringify(parsedBackgroundTraits, null, 2)}</pre>
        </div>
      )}

      {Array.isArray(parsedSymptoms) && parsedSymptoms.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-2">Reported Symptoms</h3>
          <ul className="list-disc list-inside">
            {parsedSymptoms.map((symptom, i) => <li key={i}>{symptom}</li>)}
          </ul>
        </div>
      )}

      {/* Placeholders for data not explicitly in current summary */}
      <div><h3 className="text-xl font-semibold mb-1">Timing & Intensity:</h3> <p className="text-gray-500 italic">Data not available in summary.</p></div>
      <div><h3 className="text-xl font-semibold mb-1">Care & Medication:</h3> <p className="text-gray-500 italic">Data not available in summary.</p></div>

      {Array.isArray(parsedDiagnosisResults) && parsedDiagnosisResults.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-2">Possible Conditions</h3>
          <ul className="space-y-2">
            {parsedDiagnosisResults.map((diag, i) => (
              <li key={i} className="p-2 border rounded">
                <strong>{diag.disease}</strong> ({(diag.probability * 100).toFixed(1)}%)
                {diag.description && <p className="text-sm text-gray-600">{diag.description}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
       <div><h3 className="text-xl font-semibold mb-1">Suggested Next Steps:</h3> <p className="text-gray-500 italic">Data not available in summary.</p></div>
    </div>
  );

  const renderChat = () => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
      {messages.map((msg, index) => (
        <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-xl p-3 rounded-lg shadow ${
            msg.sender === 'user' ? 'bg-gray-200 text-gray-800' : 'bg-blue-100 text-blue-800'
          }`}>
            <p className="text-sm">{msg.text}</p>
            <p className="text-xs text-gray-500 mt-1 text-right">{formatDate(msg.timestamp)}</p>
          </div>
        </div>
      ))}
      {messages.length === 0 && <p>No chat messages for this session.</p>}
    </div>
  );

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Session Details: {session_info.session_id.substring(0,8)}...
      </h1>
      
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'chat' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Chat
          </button>
        </nav>
      </div>

      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'chat' && renderChat()}
      </div>
    </div>
  );
}