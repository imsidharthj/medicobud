import {Route, Routes, Navigate } from 'react-router-dom';
import "./App.css";
import { Navbar } from "./components/navbar";
import { Footer } from "./components/footer";
import HomePage from "./Homepage";
import './index.css';
import UserLayout from './user-layout';
import Response from './Response'; 
import MedicalLibraryPage from './medical-care';
import About from './about';
import PersonalInformationPage from './user-profile/personal-information';
import SecurityPage from './user-profile/password-security';
import SettingsLayout from './user-profile/profile';
import { Chat } from './components/Chat'; 
import { DiagnosisWizard } from './components/diagnosis/DiagnosisWizard';
import HistoryPage from './components/history/HistoryPage';
import SessionDetailPage from './components/history/SessionDetailPage';
import { ProtectedRoute } from './form/ProtectedRoutes';

function App() {
  return (
    <>
      <Navbar />
      <div className="relative min-h-screen flex flex-col">
        <div className="flex-grow flex">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/medical-care" element={<MedicalLibraryPage />} />
            <Route path="/about" element={<About/>} />
            
            {/* Protected routes */}
            <Route path="/diagnosis" element={
              <ProtectedRoute>
                <UserLayout />
              </ProtectedRoute>
            } />
            
            <Route path="/response" element={
              <ProtectedRoute>
                <Response />
              </ProtectedRoute>
            } />
            
            <Route path="/user-profile" element={
              <ProtectedRoute>
                <SettingsLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="personal-information" replace />} />
              <Route path="personal-information" element={<PersonalInformationPage />} />
              <Route path="password-security" element={<SecurityPage />} />
            </Route>
            
            <Route path="/chat" element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            } />
            
            <Route path="/diagnosis-wizard" element={
              // <ProtectedRoute>
                <DiagnosisWizard />
              /* </ProtectedRoute> */
            } />
            
            <Route path="/history" element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            } />
            
            <Route path="/history/:sessionId" element={
              <ProtectedRoute>
                <SessionDetailPage />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
        <Footer />
      </div>
    </>
  );
}

export default App;
