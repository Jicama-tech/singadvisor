import React from 'react';
import { Carousel } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for navigation
import 'bootstrap/dist/css/bootstrap.min.css';

const bannerImages = [
  {
    src: "/Images/logo/banner/ban6.png",
    alt: "Empower your skill with EXPERT TRAINING",
    title: "Empower your skill with EXPERT TRAINING",
    description: "Gain the skills you need to excel in your career.",
    buttonText: "Explore Training Programs",
    navigateTo: "/trainings", // Internal route for training page
  },
  {
    src: "Images/logo/banner/find-out-more-scaled.jpeg",
    alt: "Explore Our Collection",
    title: "Explore Our Collection",
    description: "Find the perfect item for you.",
    buttonText: "Learn More",
    linkUrl: "https://docs.google.com/forms/d/1sI7UfO8WWRfazTRIHstGaX7mj-3KPnFxumyBaRguxt0/edit", 
  },
  {
    src: "Images/logo/banner/modern-career-development.webp",
    alt: "Join Our Community",
    title: "Join Our Community",
    description: "Connect with like-minded individuals.",
    buttonText: "Join Now",
    linkUrl: "https://docs.google.com/forms/d/1a0cxyGMmVW0P0K20M9dBKfu5hySIuO2nt0SE6k-xcxY/edit",
  },
];

function BannerCarousel() {
  const navigate = useNavigate(); // Initialize useNavigate for routing

  const handleButtonClick = (navigateTo, linkUrl) => {
    if (linkUrl) {
      // Navigate to external link if linkUrl exists
      window.location.href = linkUrl;
    } else if (navigateTo) {
      // Navigate to internal route if navigateTo exists
      navigate(navigateTo);
    }
  };

  return (
    <Carousel fade interval={5000} pause="hover">
      {bannerImages.map((image, index) => (
        <Carousel.Item key={index}>
          <div className="banner-image-container" style={{ position: 'relative' }}>
            <img
              className="d-block w-100 banner-image"
              src={image.src}
              alt={image.alt}
              style={{ objectFit: 'cover', height: '500px' }} // Adjust height as needed
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'white',
                textAlign: 'center',
              }}
            >
              <h2 style={{ 
                fontSize: '2.5rem', 
                marginBottom: '1rem',
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
              }}>
                {image.title}
              </h2>
              <p style={{ 
                fontSize: '1.2rem', 
                marginBottom: '1.5rem',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
              }}>
                {image.description}
              </p>
              <button
                style={{
                  padding: '10px 20px',
                  fontSize: '1rem',
                  backgroundColor: '#90ee90',
                  color: 'black',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s, color 0.3s',
                }}
                onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#006400'; // Darker green on hover
                e.target.style.color = 'white'; // Change text color to white on hover
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#90ee90'; // Revert to original background color
                e.target.style.color = 'black'; // Revert to original text color
              }}
              onClick={() => handleButtonClick(image.navigateTo, image.linkUrl)} // Handle both internal and external navigation
            >
              {image.buttonText}
              </button>
            </div>
          </div>
        </Carousel.Item>
      ))}
    </Carousel>
  );
}

export default BannerCarousel;
