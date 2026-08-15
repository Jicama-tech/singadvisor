import React from 'react';
import Navbar from '../components/Navbar'; // Assuming Navbar is a common component
import BannerCarousel from '../components/BannerCarousel';
import Responsivecards from '../components/Responsivecards';
import GridLayout from '../components/Gridlayout';
import Video from '../components/Video';
import Trainingclass from '../components/Trainingclass'
import Newsletter from '../components/Newsletter';
import WhatsAppButton from '../components/WhatsAppButton';
import Footer from '../components/Footer';





const Home = () => {
  console.log("Home component rendering");
  return (
    <div>
    <Navbar />
    <div style={{ marginTop: '80px' }}></div>
      <BannerCarousel />
      <div style={{ marginTop: '80px' }}></div>
      <Responsivecards />
      <div style={{ marginTop: '80px' }}></div>
      <Trainingclass />
      <div style={{ marginTop: '80px' }}></div>
      <GridLayout />
      <div style={{ marginTop: '80px' }}></div>
      <h1 className="text-4xl font-bold text-center mb-8"></h1>
      <div style={{ marginTop: '40px' }}></div>
      <Video />
      <div style={{ marginTop: '80px' }}></div>
      <Newsletter />
      <WhatsAppButton />
      <div style={{ marginTop: '80px' }}></div>
      <Footer />
     

    </div>
  );
};

export default Home;