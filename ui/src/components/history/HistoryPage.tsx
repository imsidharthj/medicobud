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
  // Add chief_complaint if you modify API to return it directly
  // chief_complaint?: string; 
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
  return new Date(dateString).toLocaleDateString(undefined, options);
};

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const token = await getToken();
        
        // Build URL with query parameters instead of body
        let url = `${FASTAPI_URL}/api/diagnosis/sessions`;
        
        // Add email as query parameter if available
        if (user?.emailAddresses?.[0]?.emailAddress) {
          url += `?email=${encodeURIComponent(user.emailAddresses[0].emailAddress)}`;
        }
        
        const response = await fetch(url, { 
          method: 'GET',  // Explicitly use GET
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`Failed to fetch sessions: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setSessions(data);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [getToken, user?.emailAddresses]);

  if (loading) return <div className="container mx-auto p-4 text-center">Loading history...</div>;
  if (error) return <div className="container mx-auto p-4 text-center text-red-500">Error: {error}</div>;
  if (sessions.length === 0) return <div className="container mx-auto p-4 text-center">No sessions found.</div>;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Session History</h1>
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
                  {/* Placeholder for chief complaint - you might derive this or add to API */}
                  Session: {session.session_id.substring(0, 8)} 
                </h2>
                <p className="text-sm text-gray-600">{formatDate(session.start_time)}</p>
                <p className="text-sm text-gray-500 mt-1">Status: {session.status}</p>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}