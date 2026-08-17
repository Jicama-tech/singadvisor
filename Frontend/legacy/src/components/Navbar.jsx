

import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <style>
        {`
          @media (max-width: 768px) {
            .nav-list {
              flex-direction: column !important;
              position: absolute !important;
              top: 60px !important;
              left: 0 !important;
              right: 0 !important;
              background-color: #FFF !important;
              display: ${isOpen ? 'flex' : 'none'} !important;
              padding: 1rem !important;
              z-index: 1000 !important;
            }
            .nav-item {
              margin: 0.5rem 0 !important;
            }
            .hamburger {
              display: flex !important;
              flex-direction: column;
              cursor: pointer;
              align-items: center;
              justify-content: center;
              width: 30px;
              height: 25px;
            }
            .hamburger div {
              width: 25px;
              height: 3px;
              background-color: #333; /* Set the color of the hamburger lines */
              margin: 4px 0;
              transition: all 0.3s ease;
            }
          }
          @media (min-width: 769px) {
            .nav-list {
              display: flex !important;
              flex-direction: row !important;
              position: static !important;
              background-color: transparent !important;
            }
            .hamburger {
              display: none !important;
            }
          }
        `}
      </style>

      <nav style={{
        backgroundColor: 'white',
        padding: '1rem',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        borderBottom: '1px solid grey'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center'
          }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'white' }}>
              <img 
                src="/Images/logo/Log.png" 
                alt="SingAdvisor Logo" 
                style={{ width: '190px', height: '50px', marginRight: '0.5rem' }}
              />
            </a>
          </div>

          <div 
            className="hamburger"
            onClick={toggleMenu}
            style={{
              display: 'none',
              flexDirection: 'column',
              cursor: 'pointer'
            }}
          >
            {[...Array(3)].map((_, index) => (
              <div key={index} style={{
                width: '25px',
                height: '3px',
                backgroundColor: '#333', // Set the color of the hamburger lines
                margin: '2px',
                transition: 'all 0.3s ease'
              }}></div>
            ))}
          </div>

          <ul className="nav-list" style={{
            listStyle: 'none',
            display: 'flex',
            margin: 0,
            padding: 0,
            fontWeight: 'bold',
            fontSize: '1.1rem'
          }}>
            <li className="nav-item" style={{ margin: '0 1rem' }}>
              <Link to="/" style={{
                color: 'black',
                textDecoration: 'none'
              }}>
                Home
              </Link>
            </li>
            <li className="nav-item" style={{ margin: '0 1rem' }}>
              <Link to="/Trainings" style={{
                color: 'black',
                textDecoration: 'none'
              }}>
                Trainings
              </Link>
            </li>
            <li className="nav-item" style={{ margin: '0 1rem' }}>
              <Link to="/Events" style={{
                color: 'black',
                textDecoration: 'none'
              }}>
                Events
              </Link>
            </li>
            {/* <li className="nav-item" style={{ margin: '0 1rem' }}>
              <Link to="/Services" style={{
                color: 'black',
                textDecoration: 'none'
              }}>
                Services
              </Link>
            </li> */}
            <li className="nav-item" style={{ margin: '0 1rem' }}>
              <Link to="/About" style={{
                color: 'black',
                textDecoration: 'none'
              }}>
                About
              </Link>
            </li>
            <li className="nav-item" style={{ margin: '0 1rem' }}>
              <Link to="/Contact" style={{
                color: 'black',
                textDecoration: 'none'
              }}>
                Contact Us
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
