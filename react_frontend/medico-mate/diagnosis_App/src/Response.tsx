import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
// import Link from "next/link";
import { Link } from 'react-router-dom';

interface ResponseProps {
  response: {
    name?: string;
    age?: number;
    symptoms?: string[];
    matched_diseases?: string[];
    error?: string;
  };
}

function Response({ response }: ResponseProps) {
  if (!response) {
    return (
      <Card className="p-4">
        <CardContent>No response data available.</CardContent>
      </Card>
    );
  }

  if (response.error) {
    return (
      <Card className="p-4">
        <CardContent className="text-red-500">{response.error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Diagnosis Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Patient Information */}
          <div>
            <h3 className="font-semibold mb-2">Patient Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{response.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Age</p>
                <p className="font-medium">{response.age || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Symptoms Reported */}
          <div>
            <h3 className="font-semibold mb-2">Symptoms Reported</h3>
            <ul className="list-disc list-inside space-y-1">
              {response.symptoms && response.symptoms.length > 0 ? (
                response.symptoms.map((symptom, index) => (
                  <li key={index} className="text-muted-foreground">{symptom}</li>
                ))
              ) : (
                <li className="text-muted-foreground">No symptoms reported.</li>
              )}
            </ul>
          </div>

          {/* Possible Conditions */}
          <div>
            <h3 className="font-semibold mb-2">Possible Conditions</h3>
            <ul className="space-y-2">
              {response.matched_diseases && response.matched_diseases.length > 0 ? (
                response.matched_diseases.map((disease, index) => (
                  <li key={index} className="p-3 bg-secondary rounded-lg">
                    {disease}
                  </li>
                ))
              ) : (
                <li className="p-3 bg-secondary rounded-lg">No conditions matched.</li>
              )}
            </ul>
          </div>

          {/* Recommended Actions */}
          <div>
            <h3 className="font-semibold mb-2">Recommended Actions</h3>
            <p className="text-muted-foreground">
              Please consult with a healthcare provider for a proper medical evaluation. This is not a medical
              diagnosis.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <Button asChild variant="outline">
              <Link to="/diagnosis">New Diagnosis</Link>
            </Button>
            <Button asChild>
              <Link to="/history">Save to History</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Response;