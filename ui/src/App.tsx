import {Route, Routes, Navigate } from 'react-router-dom';
import "./App.css";
import { Navbar } from "./components/navbar";
import { Footer } from "./components/footer";
import HomePage from "./Homepage";
import './index.css';
import UserLayout from './user-layout';
import Response from './Response'; // Import the Response component
import MedicalLibraryPage from './medical-care';
import About from './about';
import PersonalInformationPage from './user-profile/personal-information';
import SecurityPage from './user-profile/password-security';
import SettingsLayout from './user-profile/profile';

function App() {
  return (
    <>
      <Navbar />
      <div className="relative min-h-screen flex flex-col">
        <div className="flex-grow flex">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/diagnosis" element={<UserLayout />} />
            <Route path="/response" element={<Response />} /> {/* Route for Response */}
            <Route path="/medical-care" element={<MedicalLibraryPage />} />
            <Route path="/about" element={<About/>}></Route>
            <Route path="/user-profile" element={<SettingsLayout />}>
              <Route index element={<Navigate to="personal-information" replace />} />
              <Route path="personal-information" element={<PersonalInformationPage />} />
              <Route path="password-security" element={<SecurityPage />} />
            </Route>
          </Routes>
        </div>
        <Footer />
      </div>
    </>
  );
}

export default App;
