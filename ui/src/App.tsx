import {Route, Routes } from 'react-router-dom';
import "./App.css";
import { Navbar } from "./components/navbar";
import { Footer } from "./components/footer";
import HomePage from "./Homepage";
import './index.css';
import UserLayout from './user-layout';
import Response from './Response'; // Import the Response component
import MedicalLibraryPage from './medical-care';
import About from './about';

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
          </Routes>
        </div>
        <Footer />
      </div>
    </>
  );
}

export default App;
