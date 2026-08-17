import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Home from './pages/Home';
import Trainings from './pages/Trainings';
import Events from './pages/Events';
import './App.css';
import EventDetails from './components/EventDetails'; 
import ManageTimePage from './components/ManageTimePage'
import ManageMoneyPage from './components/ManageMoneyPage'
import ManageHealthPage from './components/ManageHealthPage'
import ManageEmotionPage from './components/ManageEmotionPage'
import About from './pages/About'
import Contact from './pages/Contact'




export default function App() {
  console.log("App component rendering");
  return (
    <Router>
      <div>
        

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/Trainings" element={<Trainings />} />
          <Route path="/Events" element={<Events />} />
          <Route path="/About" element={<About />} />
          <Route path="/Contact" element={<Contact />} />
          <Route path="/" element={<Events />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/" element={<Trainings />} />
          <Route path="/trainings/managetime" element={< ManageTimePage/>} />
          <Route path="/trainings/managemoney" element={< ManageMoneyPage/>} />
          <Route path="/trainings/managehealth" element={< ManageHealthPage/>} />
          <Route path="/trainings/manageemotion" element={< ManageEmotionPage/>} />
          
          
          
          


          
        </Routes>
      </div>
      
    </Router>
  );
}
