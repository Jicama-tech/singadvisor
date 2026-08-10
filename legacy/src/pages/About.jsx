import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import WhatsAppButton from '../components/WhatsAppButton';

function About() {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <Navbar />
      <div style={{ marginTop: '80px', padding: '40px 20px' }}>
        <h1 style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '40px' }}>About Us</h1>

        <section style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '60px' }}>
          {/* <h2 style={{ fontSize: '1.8rem', marginBottom: '20px' }}>Venkataraman Kumar</h2> */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8f9fa',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            flexWrap: 'wrap'
          }}>
            <img 
              src="/Images/Trainer/venkat1.jpeg" 
              alt="Venkat" 
              style={{ 
                borderRadius: '280px', 
                width: '200px', // Increased the width
                height: '200px', // Increased the height
                objectFit: 'unset', 
                marginBottom: '25px' 
              }} 
            />
            <div style={{ maxWidth: '500px', textAlign: 'left' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Venkataraman Kumar MBA CFP</h3>
              <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
              With over 10 years of experience in consultancy and training, Venkataraman Kumar has been a key figure in helping
            individuals and corporate personnel develop professionally and achieve their financial goals.
              </p>
              <a 
                href="https://www.linkedin.com/in/sindadvisor/" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ 
                  color: '#007bff', 
                  fontSize: '1.1rem', 
                  textDecoration: 'none', 
                  fontWeight: 'bold'
                }}
              >
                View LinkedIn Profile
              </a>
            </div>
          </div>
        </section>

        {/* Venkataraman Kumar Section
        <section style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '20px' }}>Venkataraman Kumar, MBA CFP</h2>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
            With over 10 years of experience in consultancy and training, Venkataraman Kumar has been a key figure in helping
            individuals and corporate personnel develop professionally and achieve their financial goals.
          </p>
        </section> */}

        {/* Training Section */}
        <section style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '20px' }}>Training</h2>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
            Our training programs focus on a range of topics including Personal Development, Sales, and Financial Management. 
            Venkataraman Kumar is an ACTA (Advanced Certification in Training and Assessment) and SDAF 
            (Specialist Diploma in Advanced Facilitation) certified trainer who has successfully guided many individuals 
            and corporate teams.
          </p>
        </section>

        {/* Consultancy Section */}
        <section style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '20px' }}>Consultancy</h2>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
            We work with individuals and companies to help them achieve their financial goals. Our comprehensive solutions 
            cover wealth and risk management, tailored to meet each client's unique needs. Venkataraman Kumar, a Certified 
            Financial Planner (CFP), leads our consultancy services with a client-focused approach.
          </p>
        </section>

        {/* Recruitment Section */}
        <section style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '20px' }}>Recruitment</h2>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
            We're always on the lookout for individuals who dream big and have a passion for business and people. 
            If you are business-driven and people-focused, we would love to hear from you!
          </p>
          {/* Button instead of link */}
          <button
            onClick={() => window.location.href = '/'} // Replace '/' with your target URL
            style={{
              padding: '10px 20px',
              fontSize: '1.1rem',
              backgroundColor: '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '9px',
              cursor: 'pointer',
              fontWeight: 'bold',
              textTransform: 'full-width'
            }}
          >
            Find Out More
          </button>
        </section>

        {/* Trainer Profile Section - Monica Jerath */}
        <section style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '20px' }}>Trainer Profile</h2>
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8f9fa',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            flexWrap: 'wrap'
          }}>
            <img 
              src="/Images/Trainer/monicatrainer.jpeg" 
              alt="Monica Jerath" 
              style={{ 
                borderRadius: '50%', 
                width: '200px', // Increased the width
                height: '200px', // Increased the height
                objectFit: 'cover', 
                marginBottom: '15px' 
              }} 
            />
            <div style={{ maxWidth: '500px', textAlign: 'left' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Monica Jerath</h3>
              <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
                Monica Jerath is a dynamic trainer with extensive experience in various areas of personal and professional development. 
                Her expertise includes Leadership, Sales, and Communication skills training. With her unique style of training, 
                Monica has empowered many individuals and teams to achieve their best performance.
              </p>
              <a 
                href="https://www.linkedin.com/in/monica-jerath" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ 
                  color: '#007bff', 
                  fontSize: '1.1rem', 
                  textDecoration: 'none', 
                  fontWeight: 'bold'
                }}
              >
                View LinkedIn Profile
              </a>
            </div>
          </div>
        </section>
        {/* <section style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '60px' }}>
         <h2 style={{ fontSize: '1.8rem', marginBottom: '60px' }}>Our Partners</h2>
        <div style={{
         display: 'flex',
         justifyContent: 'space-around',
         alignItems: 'center',
         flexWrap: 'wrap',
    gap: '20px'
  }}>
 <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
  <h2 style={{ fontSize: '1.5rem', color: '#333', marginBottom: '0.5rem' }}>
    Sattvik Certifications
  </h2>
  <a href="https://scsg.sg/" target="_blank" rel="noopener noreferrer">
    <img 
      src="/Images/logo/sattvik_council_of_india_logo.jpeg" 
      alt="Partner 1" 
      style={{ 
        width: '100px', 
        height: 'auto' 
      }} 
    />
  </a>
</div>


  </div>
</section> */}
<section style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '60px' }}>
  <h2 style={{ fontSize: '1.8rem', marginBottom: '20px', textAlign: 'left' }}>Our Partners</h2>
  <br></br>
  <div style={{
    display: 'flex',
    justifyContent: 'flex-start',  // Aligns content to the left
    alignItems: 'flex-start',      // Aligns items to the top
    flexWrap: 'wrap',
    gap: '20px',
  }}>
    <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
      <h2 style={{ fontSize: '1.5rem', color: '#333', marginBottom: '0.5rem' }}>
        Sattvik Certifications
      </h2>
      <a href="https://scsg.sg/" target="_blank" rel="noopener noreferrer">
        <img 
          src="/Images/logo/sattvik_council_of_india_logo.jpeg" 
          alt="Partner 1" 
          style={{ 
            width: '100px', 
            height: 'auto',
          }} 
        />
      </a>
    </div>
    {/* Other partner images can go here if needed */}
  </div>
</section>


      </div>
    <WhatsAppButton />
      <Footer/>
    </div>
  );
}

export default About;

