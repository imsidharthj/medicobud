import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from "@clerk/clerk-react";
import { useUser } from "@clerk/clerk-react";
import { FASTAPI_URL } from "@/utils/api";

interface Session {
  session_id: string;
  start_time: string;
  email: string | null;
  status: string;
}

// Helper to format date
const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  };
  try {
    return new Date(dateString).toLocaleDateString(undefined, options);
  } catch (e) {
    console.error('Error formatting date:', e);
    return dateString || 'Unknown date';
  }
};

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();
  const { user } = useUser();

  // Simple test data to verify rendering works
  useEffect(() => {
    // First try with static data to verify the component renders correctly
    const testData: Session[] = [
      {
        session_id: "test-id-1",
        start_time: new Date().toISOString(),
        email: null,
        status: "test"
      }
    ];
    
    console.log('Setting test data');
    setSessions(testData);
    setLoading(false);
    
    // Then fetch actual data
    fetchSessions();
  }, []);
  
  const fetchSessions = async () => {
    try {
      const token = await getToken();
      let url = `${FASTAPI_URL}/api/diagnosis/sessions`;
      
      if (user?.emailAddresses?.[0]?.emailAddress) {
        url += `?email=${encodeURIComponent(user.emailAddresses[0].emailAddress)}`;
      }
      
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url, { 
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API data received, length:', Array.isArray(data) ? data.length : 'not an array');
      
      if (Array.isArray(data) && data.length > 0) {
        setSessions(data);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Session History</h1>
      
      {loading && <p className="text-center">Loading history...</p>}
      
      {error && <p className="text-center text-red-500">Error: {error}</p>}
      
      {!loading && !error && sessions.length === 0 && (
        <p className="text-center">No sessions found.</p>
      )}
      
      {sessions.length > 0 && (
        <div className="relative pl-8">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
          
          {sessions.map((session) => (
            <div key={session.session_id} className="mb-8 relative">
              {/* Dot */}
              <div className="absolute left-[-0.89rem] top-1.5 w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
              <div className="ml-4 p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <Link to={`/history/${session.session_id}`} className="block">
                  <h2 className="text-xl font-semibold text-blue-600">
                    Session: {session.session_id.substring(0, 8)} 
                  </h2>
                  <p className="text-sm text-gray-600">{formatDate(session.start_time)}</p>
                  <p className="text-sm text-gray-500 mt-1">Status: {session.status}</p>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}