//import React from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Link } from 'react-router-dom';

function Response() {
  const location = useLocation();
  const { response } = location.state || {};

  if (!response) {
    return (
      <Card className="p-4 bg-white shadow-lg rounded-lg max-w-xl mx-auto mt-8">
        <CardContent className="text-gray-600">No response data available.</CardContent>
      </Card>
    );
  }

  if (response.error) {
    return (
      <Card className="p-4 bg-white shadow-lg rounded-lg max-w-xl mx-auto mt-8">
        <CardContent className="text-red-500">{response.error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8">
      {/* Main Card */}
      <Card className="bg-white shadow-lg rounded-lg p-6" style={{ backgroundColor: 'white' }}>
        {/* Card Header */}
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-[#1576d1]">
            Diagnosis Results
          </CardTitle>
        </CardHeader>

        {/* Card Content */}
        <CardContent className="space-y-6">
          {/* Patient Information Section */}
          <div>
            <h3 className="font-semibold mb-2 text-gray-700">Patient Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground text-gray-950">Name</p>
                <p className="font-medium text-gray-900">{response.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground text-gray-950">Age</p>
                <p className="font-medium text-gray-900">{response.age || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Symptoms Reported Section */}
          <div>
            <h3 className="font-semibold mb-2 text-gray-700">Symptoms Reported</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-950">
              {response.symptoms && response.symptoms.length > 0 ? (
                (response.symptoms as string[]).map((symptom, index: number) => (
                  <li key={index} className="text-muted-foreground">{symptom}</li>
                ))
              ) : (
                <li className="text-muted-foreground">No symptoms reported.</li>
              )}
            </ul>
          </div>

          {/* Possible Conditions Section */}
          <div>
            <h3 className="font-semibold mb-2 text-gray-700">Possible Conditions</h3>
            <ul className="space-y-2 text-gray-950">
              {response.matched_diseases && response.matched_diseases.length > 0 ? (
                (response.matched_diseases as string[]).map((disease, index: number) => (
                  <li
                    key={index}
                    className="p-3 bg-[#d1e7fc] rounded-lg text-[#1576d1] font-medium"
                  >
                    {disease}
                  </li>
                ))
              ) : (
                <li className="p-3 bg-[#d1e7fc] rounded-lg text-gray-700">
                  No conditions matched.
                </li>
              )}
            </ul>
          </div>

          {/* Recommended Actions Section */}
          <div>
            <h3 className="font-semibold mb-2 text-gray-700">Recommended Actions</h3>
            <p className="text-muted-foreground text-gray-950">
              Please consult with a healthcare provider for a proper medical evaluation. This is not a medical
              diagnosis.
            </p>
          </div>

          {/* Buttons Section */}
          <div className="flex gap-4 pt-4">
            <Button
              asChild
              variant="outline"
              className="border border-[#1576d1] text-[#1576d1] hover:bg-[#d1e7fc] hover:text-[#1576d1]"
            >
              <Link to="/diagnosis">New Diagnosis</Link>
            </Button>
            <Button
              asChild
              className="bg-[#1576d1] text-white hover:bg-[#105eac]"
            >
              <Link to="/history">Save to History</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Response;
